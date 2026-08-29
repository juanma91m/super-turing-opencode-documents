import path from "node:path";
import { copyFile, writeFile } from "node:fs/promises";
import type { Block } from "../../spec/index.js";
import { ensureDir, executable, projectRoot } from "../../core/paths.js";
import { run } from "../../core/process.js";
import type { ArtifactRenderer, RenderContext } from "../types.js";

const s = (v: string | undefined) => JSON.stringify(v ?? "");
function typstValue(value: unknown): string { if (value === null || value === undefined) return "none"; if (typeof value === "string") return s(value); if (typeof value === "number" || typeof value === "boolean") return String(value); if (Array.isArray(value)) return `(${value.map(typstValue).join(", ")}${value.length === 1 ? "," : ""})`; if (typeof value === "object") return `(${Object.entries(value).map(([key, item]) => `${s(key)}: ${typstValue(item)}`).join(", ")})`; throw new Error("Unsupported Typst value"); }
function blockToTypst(block: Block, asset: string | undefined, themeVar = "theme"): string {
  switch (block.type) {
    case "paragraph": return `#block(below: 7pt)[#text(${s(block.text)})]`;
    case "heading": return `${"=".repeat(block.level)} ${block.text.replaceAll("#", "\\#")}`;
    case "fieldGrid": { const columns = `(${Array.from({ length: block.columns }, () => "1fr").join(", ")}${block.columns === 1 ? "," : ""})`; const fields = block.fields.map((field) => `box(width: 100%, stroke: (bottom: .6pt + ${themeVar}.border), inset: (x: 0pt, top: 4pt, bottom: 5pt))[#text(size: 8pt, weight: "semibold", fill: ${themeVar}.muted)[#text(${s(field)})] #v(${block.lines * 14}pt)]`).join(", "); return `#block(above: 3pt, below: 12pt)[#grid(columns: ${columns}, gutter: 14pt, row-gutter: 6pt, ${fields})]`; }
    case "ruledLines": return `#block(above: 1pt, below: 16pt)[${Array.from({ length: block.count }, () => `#v(7pt)\n#line(length: 100%, stroke: .6pt + ${themeVar}.border)`).join("\n")}]`;
    case "bullets": return block.items.map((x) => `- #text(${s(x)})`).join("\n");
    case "numberedList": return block.items.map((x) => `+ #text(${s(x)})`).join("\n");
    case "quote": return `#quote(block: true, attribution: ${s(block.attribution)})[#text(${s(block.text)})]`;
    case "callout": return `#callout(${s(block.tone)}, ${s(block.title)}, [#text(${s(block.text)})], ${themeVar})`;
    case "kpiGrid": return `#kpi-grid(${typstValue(block.items)}, ${themeVar})`;
    case "table": { const header = block.table.columns.map((v) => `[#text(${s(v)})]`).join(", "); const rowLines = block.table.rowLines ?? 1; const rows = block.table.rows.map((row) => row.map((v) => rowLines > 1 ? `[#block(height: ${rowLines * 1.25}em)[#text(${s(v === null ? "No disponible" : String(v))})]]` : `[#text(${s(v === null ? "No disponible" : String(v))})]`).join(", ")).join(",\n"); const weights = block.table.columnWeights ?? block.table.columns.map(() => 1); const columns = `(${weights.map((weight) => `${weight}fr`).join(", ")}${weights.length === 1 ? "," : ""})`; const formStyle = block.table.style === "form"; const stroke = formStyle ? `(x, y) => (right: .25pt + ${themeVar}.border, bottom: if y == 0 { .9pt + ${themeVar}.accent } else { .45pt + ${themeVar}.border })` : `(x: none, y: .45pt + ${themeVar}.border)`; const fill = formStyle ? `none` : `(x, y) => if y == 0 { ${themeVar}.accent-soft } else if calc.even(y) { ${themeVar}.background }`; const table = `table(columns: ${columns}, inset: (x: 6pt, y: ${formStyle ? 5 : 6}pt), stroke: ${stroke}, fill: ${fill}, ${header}${rows ? `,\n${rows}` : ""})`; const rendered = block.table.caption ? `#figure(${table}, caption: ${s(block.table.caption)})` : `#${table}`; return `#block(above: 3pt, below: 11pt)[${rendered}]`; }
    case "chart": case "diagram": return asset ? `#figure(image(${s(asset)}, width: 100%), caption: ${s(block.type === "chart" ? (block.chart.insight ?? block.chart.title) : (block.diagram.caption ?? block.diagram.title))})` : `#callout("warning", "Visualización no disponible", [El asset no pudo generarse.], ${themeVar})`;
    case "image": return asset ? `#figure(image(${s(asset)}, width: 100%), caption: ${s(block.caption)})` : `#text(fill: ${themeVar}.muted)[Imagen no disponible]`;
    case "code": return `#figure(raw(${s(block.code)}, lang: ${s(block.language)}, block: true), caption: ${s(block.caption)})`;
    case "comparison": return `#grid(columns: (1fr, 1fr), gutter: 10pt, box(fill: ${themeVar}.surface, stroke: .5pt + ${themeVar}.border, inset: 10pt)[#strong[#text(${s(block.left.title)})] #list(${block.left.items.map((x) => `[${x}]`).join(",")})], box(fill: ${themeVar}.surface, stroke: .5pt + ${themeVar}.border, inset: 10pt)[#strong[#text(${s(block.right.title)})] #list(${block.right.items.map((x) => `[${x}]`).join(",")})])`;
    case "timeline": return `#grid(columns: (${block.items.map(() => "1fr").join(",")}), gutter: 7pt, ${block.items.map((x) => `box(fill: ${themeVar}.surface, stroke: .6pt + ${themeVar}.border, radius: 3pt, inset: 10pt)[#text(size: 9pt, weight: "semibold", fill: ${themeVar}.accent)[${x.date}] #v(7pt) #text(size: 12pt, weight: "semibold")[#text(${s(x.title)})]${x.detail ? ` #v(5pt) #text(size: 8.5pt, fill: ${themeVar}.muted)[#text(${s(x.detail)})]` : ""}]`).join(",")})`;
    case "riskMatrix": { const rows = block.items.flatMap((x) => [x.risk, x.probability, x.impact, x.mitigation]).map((x) => `[#text(${s(x)})]`).join(","); return `#table(columns: (1.3fr, .6fr, .6fr, 2fr), inset: 6pt, [*Riesgo*], [*Prob.*], [*Impacto*], [*Mitigación*], ${rows})`; }
    case "pageBreak": return `#pagebreak()`; case "slideBreak": return "";
    case "columns": return `#grid(columns: (${block.columns.map(() => "1fr").join(",")}), gutter: 10pt, ${block.columns.map((col) => `[${col.map((b) => blockToTypst(b, undefined, themeVar)).join("\n")}]`).join(",")})`;
  }
  throw new Error("Unsupported block");
}

export class TypstRenderer implements ArtifactRenderer {
  readonly format = "pdf" as const;
  async render(ctx: RenderContext): Promise<string> {
    const work = await ensureDir(path.join(ctx.outputDir, "../work", ctx.basename, "typst")); const template = path.join(work, "template.typ");
    await copyFile(path.join(projectRoot(), "templates/typst/executive-report/template.typ"), template);
    const meta = typstValue(ctx.spec.meta); const t = ctx.theme.colors;
    const theme = `(background: rgb("#${t.background}"), surface: rgb("#${t.surface}"), text: rgb("#${t.text}"), muted: rgb("#${t.muted}"), accent: rgb("#${t.accent}"), accent-soft: rgb("#${t.accentSoft}"), border: rgb("#${t.border}"), info: rgb("#${ctx.theme.callouts.info}"), success: rgb("#${ctx.theme.callouts.success}"), warning: rgb("#${ctx.theme.callouts.warning}"), risk: rgb("#${ctx.theme.callouts.risk}"))`;
    const sectionSeparator = ctx.spec.documentMode === "form" ? "\n\n" : "\n\n#pagebreak(weak: true)\n\n";
    const body = ctx.spec.sections.map((section, si) => `= ${section.title.replaceAll("#", "\\#")}\n${section.subtitle ? `#text(fill: theme.muted)[${section.subtitle}]\n` : ""}${section.blocks.map((b, bi) => { const asset = ctx.assets.get(`${si}-${bi}`); return blockToTypst(b, asset ? path.relative(work, asset) : undefined); }).join("\n\n")}`).join(sectionSeparator);
    const logoAsset = ctx.spec.brand?.logoAssetId ? ctx.assets.get(`asset:${ctx.spec.brand.logoAssetId}`) : undefined; const logo = logoAsset ? s(path.relative(work, logoAsset)) : "none";
    const source = `#import "template.typ": artifact-document, kpi-grid, callout\n#let meta = ${meta}\n#let theme = ${theme}\n#let logo = ${logo}\n#show: artifact-document.with(meta: meta, theme: theme, mode: ${s(ctx.spec.documentMode)}, logo: logo)\n${body}\n`;
    const main = path.join(work, "main.typ"), output = path.join(ctx.outputDir, `${ctx.basename}.pdf`); await writeFile(main, source); await run(executable("typst"), ["compile", "--root", path.resolve(ctx.outputDir, ".."), main, output], work); return output;
  }
}
