import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { parseDocumentSpec, type DocumentSpec } from "../spec/index.js";
import { resolveTheme } from "../theme/index.js";
import type { Theme } from "../theme/index.js";
import { VegaChartRenderer } from "../charts/index.js";
import { renderD2 } from "../diagrams/index.js";
import { ensureDir, resolveInside } from "./paths.js";
import { TypstRenderer } from "../renderers/typst/index.js";
import { PptxRenderer } from "../renderers/pptx/index.js";
import { AutoDocxRenderer } from "../renderers/docx/index.js";

export type ArtifactFormat = "pdf" | "pptx" | "docx" | "all";
export interface GenerateOptions { format: ArtifactFormat; outputDir: string; basename?: string; }
const slug = (value: string) => value.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").toLowerCase() || "artifact";
export async function loadSpec(file: string): Promise<DocumentSpec> { return parseDocumentSpec(JSON.parse(await readFile(file, "utf8"))); }
function brandedTheme(base: Theme, spec: DocumentSpec): Theme { if (!spec.brand) return base; const brand = spec.brand; return { ...base, colors: { ...base.colors, background: "FFFFFF", surface: "FFFFFF", text: brand.textColor.toUpperCase(), muted: brand.mutedColor.toUpperCase(), accent: brand.primaryColor.toUpperCase(), accentSoft: brand.softColor.toUpperCase(), border: brand.borderColor.toUpperCase() }, tables: { ...base.tables, headerFill: brand.softColor.toUpperCase(), alternateFill: "FFFFFF" }, callouts: { ...base.callouts, info: brand.softColor.toUpperCase() }, chartPalette: [brand.primaryColor.toUpperCase(), brand.mutedColor.toUpperCase(), ...base.chartPalette.slice(2)] }; }
export async function prepareAssets(spec: DocumentSpec, outputDir: string, theme: Theme): Promise<Map<string, string>> {
  const work = await ensureDir(path.resolve(outputDir, "../work", slug(spec.meta.title), "assets")), assets = new Map<string, string>(), charts = new VegaChartRenderer();
  for (const asset of spec.assets) assets.set(`asset:${asset.id}`, resolveInside(path.dirname(outputDir), asset.path));
  for (const [si, section] of spec.sections.entries()) for (const [bi, block] of section.blocks.entries()) { const key = `${si}-${bi}`; if (block.type === "chart") { const svgPath = path.join(work, `chart-${key}.svg`), pngPath = path.join(work, `chart-${key}.png`); const svg = await charts.renderSvg(block.chart, theme); await writeFile(svgPath, svg); await writeFile(pngPath, await sharp(Buffer.from(svg)).resize({ width: 1800 }).png().toBuffer()); assets.set(key, svgPath); assets.set(`${key}-png`, pngPath); } else if (block.type === "diagram") { const svgPath = await renderD2(block.diagram, theme, work, `diagram-${key}`), pngPath = path.join(work, `diagram-${key}.png`); await writeFile(pngPath, await sharp(await readFile(svgPath)).resize({ width: 1800 }).png().toBuffer()); assets.set(key, svgPath); assets.set(`${key}-png`, pngPath); } else if (block.type === "image") { const ref = spec.assets.find((a) => a.id === block.assetId); if (ref) { const resolved = resolveInside(path.dirname(outputDir), ref.path); assets.set(key, resolved); assets.set(`${key}-png`, resolved); } } }
  return assets;
}
export async function generate(spec: DocumentSpec, options: GenerateOptions): Promise<string[]> { const parsed = parseDocumentSpec(spec), outputDir = await ensureDir(path.resolve(options.outputDir)), basename = options.basename ?? slug(parsed.meta.title), theme = brandedTheme(resolveTheme(parsed.theme), parsed), assets = await prepareAssets(parsed, outputDir, theme), ctx = { spec: parsed, theme, outputDir, basename, assets }; const renderers = options.format === "all" ? [new TypstRenderer(), new PptxRenderer(), new AutoDocxRenderer()] : options.format === "pdf" ? [new TypstRenderer()] : options.format === "pptx" ? [new PptxRenderer()] : [new AutoDocxRenderer()]; const outputs: string[] = []; for (const renderer of renderers) outputs.push(await renderer.render(ctx)); return outputs; }
