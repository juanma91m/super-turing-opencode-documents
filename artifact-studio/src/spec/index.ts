import { z } from "zod";

export const SourceReferenceSchema = z.object({
  id: z.string().min(1), title: z.string().min(1), url: z.string().url().optional(),
  publisher: z.string().optional(), date: z.string().optional(), accessedAt: z.string().optional(),
  note: z.string().optional(), sample: z.boolean().default(false)
});

export const AssetReferenceSchema = z.object({
  id: z.string().min(1), path: z.string().min(1), alt: z.string().min(1),
  source: z.string().optional(), license: z.string().optional(), author: z.string().optional()
});

const TextSchema = z.string().min(1);
const KpiSchema = z.object({ label: TextSchema, value: TextSchema, context: z.string().optional(), trend: z.enum(["up", "down", "flat"]).optional() });
const TableSchema = z.object({ columns: z.array(TextSchema).min(1), rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))), columnWeights: z.array(z.number().positive()).optional(), rowLines: z.number().int().min(1).max(6).optional(), style: z.enum(["data", "form"]).default("data"), caption: z.string().optional(), sourceId: z.string().optional() }).superRefine((table, ctx) => { if (table.columnWeights && table.columnWeights.length !== table.columns.length) ctx.addIssue({ code: "custom", path: ["columnWeights"], message: "columnWeights must match columns length" }); });
const ChartSeriesSchema = z.object({ name: TextSchema, values: z.array(z.object({ category: z.string(), value: z.number() })).min(1) });
export const ChartSpecSchema = z.object({
  kind: z.enum(["bar", "line", "area", "scatter", "stackedBar", "pie", "doughnut", "combo"]),
  title: TextSchema, subtitle: z.string().optional(), insight: z.string().optional(), sourceId: z.string().optional(),
  unit: z.string().optional(), series: z.array(ChartSeriesSchema).min(1), annotations: z.array(z.object({ label: TextSchema, category: z.string().optional(), value: z.number().optional() })).default([]),
  editablePreferred: z.boolean().default(true)
});
export const DiagramSpecSchema = z.object({
  title: TextSchema, kind: z.enum(["architecture", "process", "sequence", "dependencies", "infrastructure"]),
  direction: z.enum(["right", "down"]).default("right"),
  nodes: z.array(z.object({ id: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/), label: TextSchema, group: z.string().optional() })).min(1),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })).default([]),
  caption: z.string().optional()
});

export type ChartSpec = z.infer<typeof ChartSpecSchema>;
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;
export type Block =
  | { type: "paragraph"; text: string; sourceIds: string[] }
  | { type: "heading"; text: string; level: 1 | 2 | 3 }
  | { type: "bullets" | "numberedList"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "callout"; tone: "info" | "success" | "warning" | "risk"; title: string; text: string }
  | { type: "kpiGrid"; items: Array<{ label: string; value: string; context?: string; trend?: "up" | "down" | "flat" }> }
  | { type: "table"; table: { columns: string[]; rows: Array<Array<string | number | null>>; columnWeights?: number[]; rowLines?: number; style: "data" | "form"; caption?: string; sourceId?: string } }
  | { type: "fieldGrid"; fields: string[]; columns: 1 | 2; lines: number }
  | { type: "ruledLines"; count: number }
  | { type: "chart"; chart: ChartSpec }
  | { type: "diagram"; diagram: DiagramSpec }
  | { type: "image"; assetId: string; caption?: string }
  | { type: "code"; code: string; language: string; caption?: string }
  | { type: "comparison"; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  | { type: "timeline"; items: Array<{ date: string; title: string; detail?: string; status?: "done" | "current" | "next" | "blocked" }> }
  | { type: "riskMatrix"; items: Array<{ risk: string; probability: "low" | "medium" | "high"; impact: "low" | "medium" | "high"; mitigation: string }> }
  | { type: "pageBreak" | "slideBreak" }
  | { type: "columns"; columns: Block[][] };
export const BlockSchema: z.ZodType<Block> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: TextSchema, sourceIds: z.array(z.string()).default([]) }),
  z.object({ type: z.literal("heading"), text: TextSchema, level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2) }),
  z.object({ type: z.literal("bullets"), items: z.array(TextSchema).min(1) }),
  z.object({ type: z.literal("numberedList"), items: z.array(TextSchema).min(1) }),
  z.object({ type: z.literal("quote"), text: TextSchema, attribution: z.string().optional() }),
  z.object({ type: z.literal("callout"), tone: z.enum(["info", "success", "warning", "risk"]), title: TextSchema, text: TextSchema }),
  z.object({ type: z.literal("kpiGrid"), items: z.array(KpiSchema).min(1).max(8) }),
  z.object({ type: z.literal("table"), table: TableSchema }),
  z.object({ type: z.literal("fieldGrid"), fields: z.array(TextSchema).min(1), columns: z.union([z.literal(1), z.literal(2)]).default(2), lines: z.number().int().min(1).max(6).default(1) }),
  z.object({ type: z.literal("ruledLines"), count: z.number().int().min(1).max(10).default(3) }),
  z.object({ type: z.literal("chart"), chart: ChartSpecSchema }),
  z.object({ type: z.literal("diagram"), diagram: DiagramSpecSchema }),
  z.object({ type: z.literal("image"), assetId: z.string(), caption: z.string().optional() }),
  z.object({ type: z.literal("code"), code: z.string(), language: z.string().default("text"), caption: z.string().optional() }),
  z.object({ type: z.literal("comparison"), left: z.object({ title: TextSchema, items: z.array(TextSchema) }), right: z.object({ title: TextSchema, items: z.array(TextSchema) }) }),
  z.object({ type: z.literal("timeline"), items: z.array(z.object({ date: TextSchema, title: TextSchema, detail: z.string().optional(), status: z.enum(["done", "current", "next", "blocked"]).optional() })).min(1) }),
  z.object({ type: z.literal("riskMatrix"), items: z.array(z.object({ risk: TextSchema, probability: z.enum(["low", "medium", "high"]), impact: z.enum(["low", "medium", "high"]), mitigation: TextSchema })).min(1) }),
  z.object({ type: z.literal("pageBreak") }), z.object({ type: z.literal("slideBreak") }),
  z.object({ type: z.literal("columns"), columns: z.array(z.array(BlockSchema)).min(2).max(3) })
]));

export const SectionSchema = z.object({ title: TextSchema, subtitle: z.string().optional(), blocks: z.array(BlockSchema).default([]), layoutHint: z.string().optional() });
const HexColorSchema = z.string().regex(/^[0-9A-Fa-f]{6}$/);
export const DocumentSpecSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  meta: z.object({ title: TextSchema, subtitle: z.string().optional(), author: z.string().optional(), organization: z.string().optional(), date: z.string().optional(), audience: z.string().optional(), purpose: z.string().optional(), sampleData: z.boolean().default(false) }),
  theme: z.enum(["executive-light", "executive-dark", "technical-light"]).default("executive-light"),
  brand: z.object({ primaryColor: HexColorSchema, textColor: HexColorSchema, mutedColor: HexColorSchema, softColor: HexColorSchema, borderColor: HexColorSchema, logoAssetId: z.string().optional() }).optional(),
  documentMode: z.enum(["report", "form"]).default("report"),
  sections: z.array(SectionSchema).min(1), sources: z.array(SourceReferenceSchema).default([]), assets: z.array(AssetReferenceSchema).default([])
}).superRefine((spec, ctx) => {
  const sourceIds = new Set(spec.sources.map((s) => s.id));
  const assetIds = new Set(spec.assets.map((asset) => asset.id));
  if (spec.brand?.logoAssetId && !assetIds.has(spec.brand.logoAssetId)) ctx.addIssue({ code: "custom", path: ["brand", "logoAssetId"], message: "Unknown logoAssetId" });
  for (const [si, section] of spec.sections.entries()) for (const [bi, block] of section.blocks.entries()) {
    if (block.type === "chart" && block.chart.sourceId && !sourceIds.has(block.chart.sourceId)) ctx.addIssue({ code: "custom", path: ["sections", si, "blocks", bi, "chart", "sourceId"], message: "Unknown sourceId" });
  }
});

export type DocumentSpec = z.infer<typeof DocumentSpecSchema>;

export function parseDocumentSpec(input: unknown): DocumentSpec { return DocumentSpecSchema.parse(input); }
export function documentSpecJsonSchema(): object { return z.toJSONSchema(DocumentSpecSchema, { target: "draft-2020-12" }); }
