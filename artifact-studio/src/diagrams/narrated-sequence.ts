import path from "node:path";
import os from "node:os";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { z } from "zod";
import { ensureDir, executable } from "../core/paths.js";
import { run } from "../core/process.js";
import { deliverDiagram, DiagramDeliveryError, specificationBytes, type DiagramDeliveryOptions } from "./delivery.js";
import { check, errorDiagnostic, estimateTextWidth, validateSvgComposition } from "./validation.js";

const IdSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const TextSchema = z.string().min(1);

export const NarratedSequenceSpecSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  title: TextSchema,
  subtitle: z.string().optional(),
  participants: z.array(z.object({
    id: IdSchema,
    title: TextSchema,
    subtitle: z.string().optional(),
    group: z.string().optional(),
    kind: z.enum(["actor", "service", "database"]).default("service"),
  })).min(2).max(8),
  steps: z.array(z.object({
    from: IdSchema,
    to: IdSchema,
    kind: z.enum(["navigation", "message", "internal", "persistence"]).default("message"),
    status: z.enum(["existing", "new", "configuration"]).optional(),
    statusLabel: z.string().optional(),
    text: TextSchema,
    code: z.string().optional(),
    note: z.string().optional(),
  })).min(1).max(40),
  notes: z.array(TextSchema).max(12).default([]),
}).superRefine((spec, ctx) => {
  const ids = new Set<string>();
  for (const [index, participant] of spec.participants.entries()) {
    if (ids.has(participant.id)) ctx.addIssue({ code: "custom", path: ["participants", index, "id"], message: `Duplicate participant id: ${participant.id}` });
    ids.add(participant.id);
  }
  for (const [index, step] of spec.steps.entries()) {
    if (!ids.has(step.from)) ctx.addIssue({ code: "custom", path: ["steps", index, "from"], message: `Unknown participant id: ${step.from}` });
    if (!ids.has(step.to)) ctx.addIssue({ code: "custom", path: ["steps", index, "to"], message: `Unknown participant id: ${step.to}` });
  }
});

export type NarratedSequenceSpec = z.infer<typeof NarratedSequenceSpecSchema>;
export type NarratedSequenceFormat = "svg" | "png" | "pdf" | "all";
const FONT_SANS = "IBM Plex Sans, Noto Sans, Arial, sans-serif";
const FONT_MONO = "IBM Plex Mono, Noto Sans Mono, monospace";
const STATUS_LABELS = { existing: "EXISTENTE", new: "NUEVO", configuration: "CONFIGURACIÓN" } as const;

const escapeXml = (value: string): string => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
function splitToken(word: string, maxChars: number): string[] { const chunks: string[] = []; let remaining = word; while (remaining.length > maxChars) { let splitAt = maxChars; for (let index = maxChars; index >= Math.ceil(maxChars * .55); index -= 1) if ("/?&#=_-".includes(remaining[index - 1])) { splitAt = index; break; } chunks.push(remaining.slice(0, splitAt)); remaining = remaining.slice(splitAt); } if (remaining) chunks.push(remaining); return chunks; }
function wrapLine(value: string, maxChars: number): string[] { const words = value.trim().split(/\s+/).flatMap((word) => word.length > maxChars ? splitToken(word, maxChars) : [word]); const lines: string[] = []; let current = ""; for (const word of words) { if (!current) current = word; else if (`${current} ${word}`.length <= maxChars) current += ` ${word}`; else { lines.push(current); current = word; } } if (current) lines.push(current); return lines; }
function wrapText(value: string, maxChars: number): string[] { return value.split(/\r?\n/).flatMap((line) => line.trim() ? wrapLine(line, maxChars) : [""]); }
function textBlock(lines: string[], x: number, y: number, size: number, lineHeight: number, options: { weight?: number; family?: string; fill?: string; anchor?: "start" | "middle"; italic?: boolean } = {}): string { const tspans = lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join(""); return `<text x="${x}" y="${y}" text-anchor="${options.anchor ?? "middle"}" font-family="${options.family ?? FONT_SANS}" font-size="${size}" font-weight="${options.weight ?? 400}"${options.italic ? ' font-style="italic"' : ""} fill="${options.fill ?? "#30343B"}">${tspans}</text>`; }

interface StepLayout { y: number; height: number; fromIndex: number; toIndex: number; textLines: string[]; codeLines: string[]; noteLines: string[]; textWidth: number; }
export interface NarratedSequenceRender {
  svg: string;
  width: number;
  height: number;
  validation: ReturnType<typeof validateSvgComposition>;
}

export function renderNarratedSequenceSvg(input: unknown): NarratedSequenceRender {
  const spec = NarratedSequenceSpecSchema.parse(input);
  const margin = 52, participantWidth = 190, gap = 56;
  const width = Math.max(1300, margin * 2 + spec.participants.length * participantWidth + (spec.participants.length - 1) * gap);
  const actualGap = (width - margin * 2 - spec.participants.length * participantWidth) / Math.max(1, spec.participants.length - 1);
  const centers = spec.participants.map((_, index) => margin + participantWidth / 2 + index * (participantWidth + actualGap));
  const groups = new Map<string, number[]>();
  spec.participants.forEach((participant, index) => { if (participant.group) groups.set(participant.group, [...(groups.get(participant.group) ?? []), index]); });
  const groupY = 96, groupHeight = groups.size ? 26 : 0, headerY = groupY + groupHeight + 10, headerHeight = 70, lifelineTop = headerY + headerHeight, contentTop = lifelineTop + 42;
  const layouts: StepLayout[] = [];
  let cursorY = contentTop;
  for (const step of spec.steps) {
    const fromIndex = spec.participants.findIndex((p) => p.id === step.from), toIndex = spec.participants.findIndex((p) => p.id === step.to);
    const span = Math.abs(centers[toIndex] - centers[fromIndex]);
    const neighborIndex = fromIndex < spec.participants.length - 1 ? fromIndex + 1 : fromIndex - 1;
    const neighborSpan = Math.abs(centers[neighborIndex] - centers[fromIndex]);
    const textWidth = fromIndex === toIndex
      ? Math.max(180, Math.min(260, neighborSpan - 48))
      : Math.max(250, Math.min(520, span - 42));
    const textLines = wrapText(step.text, Math.max(24, Math.floor(textWidth / 8)));
    const codeLines = step.code ? wrapText(step.code, Math.max(22, Math.floor((textWidth - 24) / 8.2))) : [];
    const noteLines = step.note ? wrapText(step.note, Math.max(25, Math.floor(textWidth / 7.5))) : [];
    const contentHeight = 48 + textLines.length * 20 + (codeLines.length ? 22 + codeLines.length * 19 : 0) + (noteLines.length ? 16 + noteLines.length * 18 : 0);
    const height = Math.max(128, contentHeight + 28);
    layouts.push({ y: cursorY, height, fromIndex, toIndex, textLines, codeLines, noteLines, textWidth });
    cursorY += height;
  }
  const legendHeight = 92 + spec.notes.length * 22;
  const height = cursorY + legendHeight + 32;
  const lifelineBottom = cursorY - 8;
  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="sequence-title sequence-desc">`, `<title id="sequence-title">${escapeXml(spec.title)}</title>`, `<desc id="sequence-desc">${escapeXml(spec.subtitle ?? `Secuencia narrada de ${spec.steps.length} pasos.`)}</desc>`, `<defs><marker id="sequence-arrow-dark" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#4B5058"/></marker><marker id="sequence-arrow-accent" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#E66F00"/></marker></defs>`, `<rect width="${width}" height="${height}" fill="#FFFFFF"/>`, textBlock([spec.title], width / 2, 42, 29, 32, { weight: 700 }), ...(spec.subtitle ? [textBlock(wrapText(spec.subtitle, 120), width / 2, 70, 15, 19, { fill: "#59616B" })] : [])];
  for (const [group, indices] of groups) { const first = Math.min(...indices), last = Math.max(...indices), x = centers[first] - participantWidth / 2, w = centers[last] - centers[first] + participantWidth; parts.push(`<rect x="${x}" y="${groupY}" width="${w}" height="${groupHeight}" fill="#4B5058"/>`, textBlock([group.toUpperCase()], x + w / 2, groupY + 18, 12, 14, { weight: 700, fill: "#FFFFFF" })); }
  spec.participants.forEach((participant, index) => { const x = centers[index] - participantWidth / 2; parts.push(`<rect x="${x}" y="${headerY}" width="${participantWidth}" height="${headerHeight}" rx="7" fill="#F3F4F4" stroke="#4B5058" stroke-width="1.5"/>`); if (participant.kind === "database") parts.push(`<ellipse cx="${centers[index]}" cy="${headerY - 11}" rx="16" ry="5" fill="#F3F4F4" stroke="#4B5058"/>`, `<path d="M ${centers[index] - 16} ${headerY - 11} V ${headerY - 2} M ${centers[index] + 16} ${headerY - 11} V ${headerY - 2}" stroke="#4B5058"/>`); parts.push(textBlock(wrapText(participant.title, 20), centers[index], headerY + 29, 15, 17, { weight: 700 })); if (participant.subtitle) parts.push(textBlock(wrapText(participant.subtitle, 24), centers[index], headerY + 54, 11, 14, { fill: "#59616B", italic: true })); parts.push(`<line x1="${centers[index]}" y1="${lifelineTop}" x2="${centers[index]}" y2="${lifelineBottom}" stroke="#666C74" stroke-width="1.4" stroke-dasharray="5 6"/>`); });

  spec.steps.forEach((step, index) => {
    const layout = layouts[index], y = layout.y + 28, x1 = centers[layout.fromIndex], x2 = centers[layout.toIndex];
    const accent = step.kind === "navigation", dashed = step.kind === "internal" || step.kind === "persistence", color = accent ? "#E66F00" : "#4B5058", marker = accent ? "sequence-arrow-accent" : "sequence-arrow-dark";
    parts.push(`<line x1="${margin}" y1="${layout.y + layout.height - 1}" x2="${width - margin}" y2="${layout.y + layout.height - 1}" stroke="#E7E9EC"/>`, `<g class="narrated-sequence-step" data-step="${index + 1}">`);
    let textX: number;
    if (layout.fromIndex === layout.toIndex) { const right = layout.fromIndex < spec.participants.length - 1, loop = right ? 64 : -64, neighbor = centers[layout.fromIndex + (right ? 1 : -1)]; parts.push(`<path d="M ${x1} ${y} H ${x1 + loop} V ${y + 34} H ${x1 + (right ? 5 : -5)}" fill="none" stroke="${color}" stroke-width="2.2"${dashed ? ' stroke-dasharray="7 6"' : ""} marker-end="url(#${marker})"/>`); textX = (x1 + neighbor) / 2; } else { const endOffset = x2 > x1 ? -7 : 7; parts.push(`<line x1="${x1}" y1="${y}" x2="${x2 + endOffset}" y2="${y}" stroke="${color}" stroke-width="2.2"${dashed ? ' stroke-dasharray="7 6"' : ""} marker-end="url(#${marker})"/>`); textX = (x1 + x2) / 2; }
    parts.push(`<circle cx="${x1}" cy="${y}" r="15" fill="#4B5058"/>`, textBlock([String(index + 1)], x1, y + 5, 12, 14, { weight: 700, fill: "#FFFFFF" }));
    let textY = y + 40;
    const annotationTop = y + 20;
    const annotationBottom = layout.y + layout.height - 2;
    const firstIntermediate = Math.min(layout.fromIndex, layout.toIndex) + 1;
    const lastIntermediate = Math.max(layout.fromIndex, layout.toIndex);
    for (let participantIndex = firstIntermediate; participantIndex < lastIntermediate; participantIndex += 1) {
      parts.push(`<rect class="sequence-route-mask" x="${centers[participantIndex] - 5}" y="${annotationTop}" width="10" height="${annotationBottom - annotationTop}" fill="#FFFFFF"/>`);
    }
    if (step.status) { const label = step.statusLabel ?? STATUS_LABELS[step.status], badgeWidth = Math.max(58, label.length * 7 + 18), badgeFill = step.status === "new" ? "#E66F00" : "#FFFFFF", badgeStroke = step.status === "configuration" ? "#E66F00" : "#656B72", badgeText = step.status === "new" ? "#FFFFFF" : step.status === "configuration" ? "#D56500" : "#4B5058"; parts.push(`<rect x="${textX - badgeWidth / 2}" y="${textY - 18}" width="${badgeWidth}" height="22" rx="5" fill="${badgeFill}" stroke="${badgeStroke}"${step.status === "configuration" ? ' stroke-dasharray="5 4"' : ""}/>`, textBlock([label], textX, textY - 3, 10, 12, { weight: 700, fill: badgeText })); textY += 24; }
    const messageLabelWidth = Math.min(layout.textWidth, Math.max(...layout.textLines.map((line) => estimateTextWidth(line, 14))) + 24);
    parts.push(`<rect class="sequence-message-mask" x="${textX - messageLabelWidth / 2}" y="${textY - 17}" width="${messageLabelWidth}" height="${layout.textLines.length * 20 + 8}" rx="4" fill="#FFFFFF"/>`);
    parts.push(textBlock(layout.textLines, textX, textY, 14, 20)); textY += layout.textLines.length * 20 + 12;
    if (layout.codeLines.length) { const boxHeight = layout.codeLines.length * 19 + 14; parts.push(`<rect x="${textX - layout.textWidth / 2}" y="${textY - 13}" width="${layout.textWidth}" height="${boxHeight}" rx="5" fill="#F7F8F8" stroke="#6A7078"/>`, textBlock(layout.codeLines, textX, textY + 3, 12, 19, { family: FONT_MONO })); textY += boxHeight + 4; }
    if (layout.noteLines.length) parts.push(textBlock(layout.noteLines, textX, textY, 11, 18, { weight: 600, fill: "#D56500", italic: true }));
    parts.push("</g>");
  });
  const legendY = cursorY + 22; parts.push(textBlock(["Referencias"], margin, legendY, 16, 18, { weight: 700, anchor: "start" }), `<line x1="${margin}" y1="${legendY + 27}" x2="${margin + 54}" y2="${legendY + 27}" stroke="#E66F00" stroke-width="3"/>`, textBlock(["Navegación del usuario o flujo principal"], margin + 68, legendY + 32, 12, 15, { anchor: "start" }), `<line x1="${margin}" y1="${legendY + 51}" x2="${margin + 54}" y2="${legendY + 51}" stroke="#4B5058" stroke-width="3"/>`, textBlock(["Llamada servidor a servidor"], margin + 68, legendY + 56, 12, 15, { anchor: "start" }), `<line x1="${margin}" y1="${legendY + 75}" x2="${margin + 54}" y2="${legendY + 75}" stroke="#4B5058" stroke-width="3" stroke-dasharray="7 6"/>`, textBlock(["Persistencia o procesamiento interno"], margin + 68, legendY + 80, 12, 15, { anchor: "start" }));
  if (spec.notes.length) { const notesX = width / 2; parts.push(textBlock(["Notas"], notesX, legendY, 16, 18, { weight: 700, anchor: "start" })); spec.notes.forEach((note, index) => parts.push(textBlock([`• ${note}`], notesX, legendY + 26 + index * 22, 12, 15, { anchor: "start" }))); }
  parts.push("</svg>");
  const svg = `${parts.join("\n")}\n`;
  const diagnostics = [];
  for (const participant of spec.participants) {
    const titleLines = wrapText(participant.title, 20);
    const subtitleLines = participant.subtitle ? wrapText(participant.subtitle, 24) : [];
    if (titleLines.length > 2 || subtitleLines.length > 1) diagnostics.push(errorDiagnostic(
      "composition/label-fit",
      "A participant label exceeds the fixed sequence header.",
      { participant: participant.id },
      { titleLines: titleLines.length, subtitleLines: subtitleLines.length, maxTitleLines: 2, maxSubtitleLines: 1 },
      ["shorten the participant title or move supporting detail into a sequence note"],
    ));
  }
  for (const [group, indices] of groups) {
    const groupWidth = centers[Math.max(...indices)] - centers[Math.min(...indices)] + participantWidth;
    const estimatedWidth = estimateTextWidth(group.toUpperCase(), 12);
    if (estimatedWidth > groupWidth - 20) diagnostics.push(errorDiagnostic(
      "composition/label-fit",
      "A participant-group label exceeds its available width.",
      { group },
      { estimatedWidth: Math.round(estimatedWidth), availableWidth: Math.round(groupWidth - 20) },
      ["shorten the group label while preserving its ownership meaning"],
    ));
  }
  const messageCount = svg.match(/class="narrated-sequence-step"/g)?.length ?? 0;
  const messageMaskCount = svg.match(/class="sequence-message-mask"/g)?.length ?? 0;
  const routeMaskCount = svg.match(/class="sequence-route-mask"/g)?.length ?? 0;
  const expectedRouteMasks = layouts.reduce((total, layout) => total + Math.max(0, Math.abs(layout.toIndex - layout.fromIndex) - 1), 0);
  const validation = validateSvgComposition({
    kind: "narrated-sequence",
    svg,
    width,
    height,
    semanticClass: "narrated-sequence-step",
    expectedSemanticCount: spec.steps.length,
    extraChecks: [
      check("label_fit", diagnostics.length === 0),
      check("message_count", messageCount === spec.steps.length, [`${messageCount}/${spec.steps.length} messages`]),
      check("message_label_masks", messageMaskCount === spec.steps.length, [`${messageMaskCount}/${spec.steps.length} masks`]),
      check("intermediate_route_masks", routeMaskCount === expectedRouteMasks, [`${routeMaskCount}/${expectedRouteMasks} masks`]),
    ],
    extraDiagnostics: [
      ...diagnostics,
      ...(messageCount === spec.steps.length ? [] : [errorDiagnostic(
        "artifact/message-count",
        "The generated SVG does not contain every authored sequence message.",
        { diagram: "narrated-sequence" },
        { expected: spec.steps.length, actual: messageCount },
        ["restore the missing message and regenerate"],
      )]),
      ...(messageMaskCount === spec.steps.length ? [] : [errorDiagnostic(
        "composition/message-label-clearance",
        "A sequence message is missing its renderer-owned route-clearance mask.",
        { diagram: "narrated-sequence" },
        { expected: spec.steps.length, actual: messageMaskCount },
        ["restore the message label mask and regenerate"],
      )]),
      ...(routeMaskCount === expectedRouteMasks ? [] : [errorDiagnostic(
        "composition/intermediate-route-clearance",
        "A sequence annotation is missing renderer-owned clearance over an intermediate lifeline.",
        { diagram: "narrated-sequence" },
        { expected: expectedRouteMasks, actual: routeMaskCount },
        ["restore intermediate route masks and regenerate"],
      )]),
    ],
  });
  return { svg, width, height, validation };
}

export async function renderNarratedSequenceFiles(input: unknown, outputDir: string, basename: string, format: NarratedSequenceFormat, options: DiagramDeliveryOptions = {}): Promise<string[]> {
  const spec = NarratedSequenceSpecSchema.parse(input);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(basename)) throw new Error("Narrated-sequence output name must be a simple filename");
  const output = await ensureDir(outputDir);
  const rendered = renderNarratedSequenceSvg(spec);
  const specification = specificationBytes(spec, options);
  return deliverDiagram({
    kind: "narrated-sequence",
    title: spec.title,
    outputDir: output,
    reportName: `${basename}.narrated-sequence-report.json`,
    specification: specification.bytes,
    specificationRepresentation: specification.representation,
    metadata: {
      participants: spec.participants.length,
      steps: spec.steps.length,
      canvas: { width: rendered.width, height: rendered.height },
    },
    validation: rendered.validation,
    build: async (stagingDir) => {
      const candidates = [];
      const svgName = `${basename}.svg`;
      await writeFile(path.join(stagingDir, svgName), rendered.svg);
      candidates.push({ name: svgName, path: path.join(stagingDir, svgName) });
      if (format === "png" || format === "all") {
        const pngName = `${basename}.png`;
        await writeFile(path.join(stagingDir, pngName), await sharp(Buffer.from(rendered.svg), { density: 192 }).resize({ width: rendered.width * 2 }).png().toBuffer());
        candidates.push({ name: pngName, path: path.join(stagingDir, pngName) });
      }
      if (format === "pdf" || format === "all") {
        const pdfName = `${basename}.pdf`;
        const temporary = await mkdtemp(path.join(os.tmpdir(), "artifact-narrated-sequence-"));
        try {
          await writeFile(path.join(temporary, "diagram.svg"), rendered.svg);
          const pageWidthMm = 420;
          const pageHeightMm = pageWidthMm * rendered.height / rendered.width;
          await writeFile(path.join(temporary, "diagram.typ"), `#set page(width: ${pageWidthMm}mm, height: ${pageHeightMm.toFixed(2)}mm, margin: 0mm, fill: white)\n#place(top + left, image("diagram.svg", width: 100%, height: 100%, fit: "contain"))\n`);
          await run(executable("typst"), ["compile", "diagram.typ", path.join(stagingDir, pdfName)], temporary);
        } finally {
          await rm(temporary, { recursive: true, force: true });
        }
        candidates.push({ name: pdfName, path: path.join(stagingDir, pdfName) });
      }
      return candidates;
    },
  });
}
export function narratedSequenceJsonSchema(): object { return z.toJSONSchema(NarratedSequenceSpecSchema, { target: "draft-2020-12" }); }
export { DiagramDeliveryError };
