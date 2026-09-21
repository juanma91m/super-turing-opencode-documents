import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { z } from "zod";
import { ensureDir, executable } from "../core/paths.js";
import { run } from "../core/process.js";

const IdentifierSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const TextSchema = z.string().min(1);

export const ServiceFlowSpecSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  title: TextSchema,
  subtitle: z.string().optional(),
  connectors: z.boolean().default(true),
  lanes: z.array(z.object({
    id: IdentifierSchema,
    title: TextSchema,
    components: z.array(TextSchema).max(4).default([]),
  })).min(2).max(6),
  steps: z.array(z.object({
    lane: IdentifierSchema,
    actor: z.string().optional(),
    text: TextSchema,
    code: z.string().optional(),
  })).min(1).max(40),
}).superRefine((spec, ctx) => {
  const laneIds = new Set<string>();
  for (const [index, lane] of spec.lanes.entries()) {
    if (laneIds.has(lane.id)) ctx.addIssue({ code: "custom", path: ["lanes", index, "id"], message: `Duplicate lane id: ${lane.id}` });
    laneIds.add(lane.id);
  }
  for (const [index, step] of spec.steps.entries()) {
    if (!laneIds.has(step.lane)) ctx.addIssue({ code: "custom", path: ["steps", index, "lane"], message: `Unknown lane id: ${step.lane}` });
  }
});

export type ServiceFlowSpec = z.infer<typeof ServiceFlowSpecSchema>;
export type ServiceFlowFormat = "svg" | "png" | "pdf" | "all";

const PALETTE = ["2563EB", "D97706", "7C3AED", "059669", "DC2626", "0891B2"];
const FONT_SANS = "IBM Plex Sans, Noto Sans, Arial, sans-serif";
const FONT_MONO = "IBM Plex Mono, Noto Sans Mono, monospace";

const escapeXml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

function wrapLine(value: string, maxChars: number): string[] {
  if (!value) return [];
  const words = value.trim().split(/\s+/).flatMap((word) => {
    if (word.length <= maxChars) return [word];
    const chunks: string[] = [];
    let remaining = word;
    while (remaining.length > maxChars) {
      let splitAt = maxChars;
      const minimumUsefulSplit = Math.ceil(maxChars * 0.55);
      for (let index = maxChars; index >= minimumUsefulSplit; index -= 1) {
        if ("/?&#=_-".includes(remaining[index - 1])) { splitAt = index; break; }
      }
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt);
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  });
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= maxChars) current = `${current} ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapText(value: string, maxChars: number): string[] {
  return value.split(/\r?\n/).flatMap((line) => line.trim() ? wrapLine(line, maxChars) : [""]);
}

function textBlock(lines: string[], x: number, y: number, options: { size: number; lineHeight: number; weight?: number; family?: string; anchor?: "start" | "middle" } ): string {
  const anchor = options.anchor ?? "middle";
  const tspans = lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : options.lineHeight}">${escapeXml(line)}</tspan>`).join("");
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${options.family ?? FONT_SANS}" font-size="${options.size}" font-weight="${options.weight ?? 400}" fill="#263238">${tspans}</text>`;
}

interface StepLayout { x: number; y: number; width: number; height: number; laneIndex: number; textLines: string[]; codeLines: string[]; }

export interface ServiceFlowRender { svg: string; width: number; height: number; }

export function renderServiceFlowSvg(input: unknown): ServiceFlowRender {
  const spec = ServiceFlowSpecSchema.parse(input);
  const margin = 36;
  const gap = 28;
  const laneWidth = 350;
  const width = Math.max(960, margin * 2 + spec.lanes.length * laneWidth + (spec.lanes.length - 1) * gap);
  const actualLaneWidth = (width - margin * 2 - gap * (spec.lanes.length - 1)) / spec.lanes.length;
  const titleY = 44;
  const subtitleLines = spec.subtitle ? wrapText(spec.subtitle, 110) : [];
  const headerY = subtitleLines.length ? 106 : 82;
  const maxComponents = Math.max(...spec.lanes.map((lane) => lane.components.length));
  const headerHeight = 64 + maxComponents * 34;
  const contentY = headerY + headerHeight + 28;
  const cardWidth = actualLaneWidth - 28;
  const layouts: StepLayout[] = [];
  let cursorY = contentY;

  for (const step of spec.steps) {
    const laneIndex = spec.lanes.findIndex((lane) => lane.id === step.lane);
    const textLines = wrapText(step.text, Math.max(24, Math.floor((cardWidth - 68) / 8.2)));
    const codeLines = step.code ? wrapText(step.code, Math.max(22, Math.floor((cardWidth - 48) / 8.2))) : [];
    const actorHeight = step.actor ? 25 : 0;
    const textHeight = Math.max(1, textLines.length) * 22;
    const codeHeight = codeLines.length ? 22 + codeLines.length * 20 : 0;
    const height = Math.max(108, 30 + actorHeight + textHeight + codeHeight + 24);
    const x = margin + laneIndex * (actualLaneWidth + gap) + 14;
    layouts.push({ x, y: cursorY, width: cardWidth, height, laneIndex, textLines, codeLines });
    cursorY += height + 54;
  }

  const height = cursorY - 24;
  const laneBackgroundY = headerY + headerHeight + 14;
  const laneBackgroundHeight = height - laneBackgroundY - 20;
  const defs = spec.connectors ? `<defs><marker id="service-flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#374151"/></marker></defs>` : "";
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="service-flow-title service-flow-desc">`,
    `<title id="service-flow-title">${escapeXml(spec.title)}</title>`,
    `<desc id="service-flow-desc">${escapeXml(spec.subtitle ?? `Flujo de ${spec.steps.length} pasos entre ${spec.lanes.length} servicios.`)}</desc>`,
    defs,
    `<rect width="${width}" height="${height}" fill="#FFFFFF"/>`,
    textBlock([spec.title], width / 2, titleY, { size: 31, lineHeight: 34, weight: 700 }),
  ];
  if (subtitleLines.length) parts.push(textBlock(subtitleLines, width / 2, 76, { size: 16, lineHeight: 20 }));

  spec.lanes.forEach((lane, index) => {
    const x = margin + index * (actualLaneWidth + gap);
    const accent = PALETTE[index % PALETTE.length];
    parts.push(`<rect x="${x}" y="${laneBackgroundY}" width="${actualLaneWidth}" height="${laneBackgroundHeight}" rx="12" fill="#${accent}" fill-opacity="0.045"/>`);
    parts.push(`<rect x="${x}" y="${headerY}" width="${actualLaneWidth}" height="${headerHeight}" rx="10" fill="#${accent}" fill-opacity="0.08" stroke="#${accent}" stroke-width="2"/>`);
    const titleBaseline = lane.components.length ? headerY + 28 : headerY + headerHeight / 2 + 7;
    parts.push(textBlock([lane.title.toUpperCase()], x + actualLaneWidth / 2, titleBaseline, { size: 17, lineHeight: 20, weight: 700 }));
    lane.components.forEach((component, componentIndex) => {
      const componentY = headerY + 43 + componentIndex * 34;
      parts.push(`<line x1="${x}" y1="${componentY}" x2="${x + actualLaneWidth}" y2="${componentY}" stroke="#${accent}" stroke-width="1.2"/>`);
      parts.push(textBlock([component], x + actualLaneWidth / 2, componentY + 22, { size: 14, lineHeight: 18, weight: 600 }));
    });
  });

  if (spec.connectors) {
    for (let index = 1; index < layouts.length; index += 1) {
      const previous = layouts[index - 1];
      const current = layouts[index];
      const x1 = previous.x + previous.width / 2;
      const y1 = previous.y + previous.height;
      const x2 = current.x + current.width / 2;
      const y2 = current.y;
      if (previous.laneIndex === current.laneIndex) {
        parts.push(`<path class="service-flow-connector" d="M ${x1} ${y1} L ${x2} ${y2 - 7}" fill="none" stroke="#374151" stroke-width="2.4" marker-end="url(#service-flow-arrow)"/>`);
      } else {
        const middleY = Math.round(y1 + (y2 - y1) / 2);
        parts.push(`<path class="service-flow-connector" d="M ${x1} ${y1} L ${x1} ${middleY} L ${x2} ${middleY} L ${x2} ${y2 - 7}" fill="none" stroke="#374151" stroke-width="2.4" stroke-linejoin="round" marker-end="url(#service-flow-arrow)"/>`);
      }
    }
  }

  spec.steps.forEach((step, index) => {
    const layout = layouts[index];
    const accent = PALETTE[layout.laneIndex % PALETTE.length];
    parts.push(`<g class="service-flow-step" data-step="${index + 1}" data-lane="${escapeXml(step.lane)}">`);
    parts.push(`<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" rx="12" fill="#FFFFFF" stroke="#${accent}" stroke-width="2.3"/>`);
    parts.push(`<circle cx="${layout.x + 31}" cy="${layout.y + 31}" r="22" fill="#${accent}"/>`);
    parts.push(textBlock([String(index + 1)], layout.x + 31, layout.y + 38, { size: 18, lineHeight: 20, weight: 700 } ).replace('fill="#263238"', 'fill="#FFFFFF"'));
    const contentX = layout.x + layout.width / 2 + 15;
    let textY = layout.y + 34;
    if (step.actor) {
      parts.push(textBlock([step.actor.toUpperCase()], contentX, textY, { size: 14, lineHeight: 18, weight: 700 }));
      textY += 30;
    }
    parts.push(textBlock(layout.textLines, contentX, textY, { size: 15, lineHeight: 22 }));
    textY += Math.max(1, layout.textLines.length) * 22 + 12;
    if (layout.codeLines.length) {
      const codeY = textY;
      const codeHeight = layout.codeLines.length * 20 + 16;
      parts.push(`<rect x="${layout.x + 18}" y="${codeY - 14}" width="${layout.width - 36}" height="${codeHeight}" rx="6" fill="#F8FAFC" stroke="#${accent}" stroke-width="1"/>`);
      parts.push(textBlock(layout.codeLines, layout.x + layout.width / 2, codeY + 4, { size: 13, lineHeight: 20, family: FONT_MONO }));
    }
    parts.push("</g>");
  });
  parts.push("</svg>");
  return { svg: `${parts.join("\n")}\n`, width, height };
}

async function sha256(file: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export async function renderServiceFlowFiles(input: unknown, outputDir: string, basename: string, format: ServiceFlowFormat): Promise<string[]> {
  const spec = ServiceFlowSpecSchema.parse(input);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(basename)) throw new Error("Service-flow output name must be a simple filename");
  const output = await ensureDir(outputDir);
  const rendered = renderServiceFlowSvg(spec);
  const svgPath = path.join(output, `${basename}.svg`);
  await writeFile(svgPath, rendered.svg);
  const artifacts = [svgPath];

  if (format === "png" || format === "all") {
    const pngPath = path.join(output, `${basename}.png`);
    await writeFile(pngPath, await sharp(Buffer.from(rendered.svg), { density: 192 }).resize({ width: rendered.width * 2 }).png().toBuffer());
    artifacts.push(pngPath);
  }

  if (format === "pdf" || format === "all") {
    const pdfPath = path.join(output, `${basename}.pdf`);
    const temporary = await mkdtemp(path.join(os.tmpdir(), "artifact-service-flow-"));
    try {
      await writeFile(path.join(temporary, "diagram.svg"), rendered.svg);
      const pageWidthMm = 300;
      const pageHeightMm = pageWidthMm * rendered.height / rendered.width;
      await writeFile(path.join(temporary, "diagram.typ"), `#set page(width: ${pageWidthMm}mm, height: ${pageHeightMm.toFixed(2)}mm, margin: 0mm, fill: white)\n#place(top + left, image("diagram.svg", width: 100%, height: 100%, fit: "contain"))\n`);
      await run(executable("typst"), ["compile", "diagram.typ", pdfPath], temporary);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
    artifacts.push(pdfPath);
  }

  const reportPath = path.join(output, `${basename}.service-flow-report.json`);
  await writeFile(reportPath, `${JSON.stringify({
    title: spec.title,
    lanes: spec.lanes.length,
    steps: spec.steps.length,
    connectors: spec.connectors,
    canvas: { width: rendered.width, height: rendered.height },
    artifacts: await Promise.all(artifacts.map(async (file) => ({ path: file, bytes: (await readFile(file)).byteLength, sha256: await sha256(file) }))),
  }, null, 2)}\n`);
  artifacts.push(reportPath);
  return artifacts;
}

export function serviceFlowJsonSchema(): object {
  return z.toJSONSchema(ServiceFlowSpecSchema, { target: "draft-2020-12" });
}
