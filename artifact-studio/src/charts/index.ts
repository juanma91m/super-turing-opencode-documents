import { compile, type TopLevelSpec } from "vega-lite";
import * as vega from "vega";
import sharp from "sharp";
import type { ChartSpec } from "../spec/index.js";
import type { Theme } from "../theme/index.js";

export interface PptxNativeChart { type: "bar" | "line" | "area" | "scatter" | "pie" | "doughnut"; data: Array<{ name: string; labels: string[]; values: number[] }>; }
export interface ChartRenderer { renderSvg(spec: ChartSpec, theme: Theme): Promise<string>; renderPng(spec: ChartSpec, theme: Theme, density?: number): Promise<Buffer>; renderPptxNative(spec: ChartSpec): PptxNativeChart | null; }

export function recommendChart(kind: ChartSpec["kind"], categoryCount: number): ChartSpec["kind"] { if ((kind === "pie" || kind === "doughnut") && categoryCount > 5) return "bar"; return kind; }
function toVegaLite(spec: ChartSpec, theme: Theme): TopLevelSpec {
  const kind = recommendChart(spec.kind, spec.series[0]?.values.length ?? 0); const values = spec.series.flatMap((s) => s.values.map((v) => ({ category: v.category, value: v.value, series: s.name })));
  const temporal = kind === "line" || kind === "area"; const mark = kind === "stackedBar" ? { type: "bar" as const } : kind === "doughnut" ? { type: "arc" as const, innerRadius: 55 } : kind === "pie" ? { type: "arc" as const } : kind === "scatter" ? { type: "point" as const, filled: true } : { type: kind as "bar" | "line" | "area", point: kind === "line" };
  const palette = theme.chartPalette.map((color) => `#${color}`);
  if (kind === "pie" || kind === "doughnut") return { width: 640, height: 360, data: { values }, mark, encoding: { theta: { field: "value", type: "quantitative" }, color: { field: "category", type: "nominal", scale: { range: palette } }, tooltip: [{ field: "category" }, { field: "value", title: spec.unit }] }, config: { background: `#${theme.colors.surface}`, font: theme.typography.sans, legend: { orient: "right" } } } as TopLevelSpec;
  return { width: 640, height: 340, data: { values }, mark, encoding: { x: { field: "category", type: temporal ? "temporal" : "nominal", axis: { labelAngle: 0, grid: false, title: null } }, y: { field: "value", type: "quantitative", title: spec.unit ?? null, scale: kind === "bar" || kind === "stackedBar" ? { zero: true } : undefined }, color: { field: "series", type: "nominal", scale: { range: palette }, legend: spec.series.length > 1 ? { orient: "bottom" } : null }, tooltip: [{ field: "series" }, { field: "category" }, { field: "value", title: spec.unit }] }, config: { background: `#${theme.colors.surface}`, font: theme.typography.sans, axis: { gridColor: `#${theme.colors.border}`, gridOpacity: 0.45, labelColor: `#${theme.colors.text}`, titleColor: `#${theme.colors.muted}` }, view: { stroke: null } } } as TopLevelSpec;
}
export class VegaChartRenderer implements ChartRenderer {
  async renderSvg(spec: ChartSpec, theme: Theme): Promise<string> { const vg = compile(toVegaLite(spec, theme)).spec; const view = new vega.View(vega.parse(vg), { renderer: "none" }); try { const svg = await view.toSVG(); return svg.replace(/(stroke|fill)="([0-9A-Fa-f]{6})"/g, '$1="#$2"').replace(/<\/svg>><\/svg>$/, "</svg>"); } finally { view.finalize(); } }
  async renderPng(spec: ChartSpec, theme: Theme, density = 2): Promise<Buffer> { return sharp(Buffer.from(await this.renderSvg(spec, theme))).png({ quality: 100 }).resize({ width: 1280 * density / 2 }).toBuffer(); }
  renderPptxNative(spec: ChartSpec): PptxNativeChart | null { const kind = recommendChart(spec.kind, spec.series[0]?.values.length ?? 0); if (kind === "combo" || kind === "stackedBar") return null; return { type: kind, data: spec.series.map((s) => ({ name: s.name, labels: s.values.map((v) => v.category), values: s.values.map((v) => v.value) })) }; }
}
