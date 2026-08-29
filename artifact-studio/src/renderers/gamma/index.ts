import type { Block, DocumentSpec } from "../../spec/index.js";
import type { RenderContext } from "../types.js";

export interface GammaOptions { explicitlyRequested: boolean; allowExternalContent: boolean; numCards?: number; exportAs?: "pdf" | "pptx"; timeoutMs?: number; }
export interface GammaResult { generationId: string; gammaId?: string; gammaUrl?: string; exportUrl?: string; }

function blockText(block: Block): string {
  switch (block.type) {
    case "paragraph": return block.text;
    case "heading": return `${"#".repeat(block.level)} ${block.text}`;
    case "bullets": return block.items.map((item) => `- ${item}`).join("\n");
    case "numberedList": return block.items.map((item, index) => `${index + 1}. ${item}`).join("\n");
    case "quote": return `> ${block.text}${block.attribution ? ` — ${block.attribution}` : ""}`;
    case "callout": return `**${block.title}:** ${block.text}`;
    case "kpiGrid": return block.items.map((item) => `- ${item.label}: ${item.value}${item.context ? ` (${item.context})` : ""}`).join("\n");
    case "fieldGrid": return block.fields.join(" | ");
    case "ruledLines": return Array.from({ length: block.count }, () => "________________").join("\n");
    case "table": return [block.table.columns.join(" | "), ...block.table.rows.map((row) => row.map((value) => value ?? "No disponible").join(" | "))].join("\n");
    case "chart": return `Gráfico: ${block.chart.title}. ${block.chart.insight ?? ""}\n${block.chart.series.map((series) => `${series.name}: ${series.values.map((point) => `${point.category}=${point.value}`).join(", ")}`).join("\n")}`;
    case "diagram": return `Diagrama: ${block.diagram.title}. Nodos: ${block.diagram.nodes.map((node) => node.label).join(", ")}. Relaciones: ${block.diagram.edges.map((edge) => `${edge.from} → ${edge.to}${edge.label ? ` (${edge.label})` : ""}`).join(", ")}.`;
    case "image": return `Imagen: ${block.caption ?? block.assetId}`;
    case "code": return `\`\`\`${block.language}\n${block.code}\n\`\`\``;
    case "comparison": return `${block.left.title}: ${block.left.items.join("; ")}\n${block.right.title}: ${block.right.items.join("; ")}`;
    case "timeline": return block.items.map((item) => `${item.date}: ${item.title}${item.detail ? ` — ${item.detail}` : ""}`).join("\n");
    case "riskMatrix": return block.items.map((item) => `${item.risk} | probabilidad ${item.probability} | impacto ${item.impact} | mitigación: ${item.mitigation}`).join("\n");
    case "pageBreak": case "slideBreak": return "\n---\n";
    case "columns": return block.columns.flat().map(blockText).join("\n");
  }
}
function inputText(spec: DocumentSpec): string { return [`# ${spec.meta.title}`, spec.meta.subtitle ?? "", ...spec.sections.flatMap((section) => [`\n## ${section.title}`, section.subtitle ?? "", ...section.blocks.map(blockText)]), spec.sources.length ? "\n## Fuentes" : "", ...spec.sources.map((source) => `- ${source.sample ? "[SAMPLE] " : ""}${source.title}${source.publisher ? ` — ${source.publisher}` : ""}${source.url ? ` — ${source.url}` : ""}`)].filter(Boolean).join("\n\n"); }
async function json(response: Response): Promise<Record<string, unknown>> { const payload = await response.json() as Record<string, unknown>; if (!response.ok) throw new Error(`Gamma API ${response.status}: ${JSON.stringify(payload)}`); return payload; }

export class GammaRenderer {
  async render(ctx: RenderContext, options: GammaOptions): Promise<GammaResult> {
    if (!options.explicitlyRequested || !options.allowExternalContent) throw new Error("Gamma requires explicit request and authorization to send content externally");
    const apiKey = process.env.GAMMA_API_KEY, themeId = process.env.GAMMA_THEME_ID;
    if (!apiKey) throw new Error("GAMMA_API_KEY is not configured");
    if (ctx.spec.meta.purpose?.match(/confidential|private|proprietary|sensitive|confidencial|privad|sensible/i)) throw new Error("Potentially sensitive content cannot be sent to Gamma");
    const created = await json(await fetch("https://public-api.gamma.app/v1.0/generations", { method: "POST", headers: { "Content-Type": "application/json", "X-API-KEY": apiKey }, body: JSON.stringify({ inputText: inputText(ctx.spec), textMode: "preserve", format: "presentation", numCards: options.numCards ?? Math.min(20, Math.max(1, ctx.spec.sections.length + 1)), exportAs: options.exportAs ?? "pptx", ...(themeId ? { themeId } : {}), cardOptions: { dimensions: "16x9" }, imageOptions: { source: "noImages" }, textOptions: { language: "es", audience: ctx.spec.meta.audience, tone: "sobrio, profesional y ejecutivo" } }) }));
    const generationId = String(created.generationId ?? ""); if (!generationId) throw new Error("Gamma API did not return generationId");
    const deadline = Date.now() + (options.timeoutMs ?? 120_000);
    while (Date.now() < deadline) { await new Promise((resolve) => setTimeout(resolve, 5_000)); const status = await json(await fetch(`https://public-api.gamma.app/v1.0/generations/${encodeURIComponent(generationId)}`, { headers: { "X-API-KEY": apiKey } })); if (status.status === "failed") throw new Error(`Gamma generation failed: ${JSON.stringify(status)}`); if (status.status === "completed") return { generationId, gammaId: status.gammaId as string | undefined, gammaUrl: status.gammaUrl as string | undefined, exportUrl: status.exportUrl as string | undefined }; }
    throw new Error(`Gamma generation timed out: ${generationId}`);
  }
}
