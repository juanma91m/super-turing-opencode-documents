import path from "node:path";
import { writeFile } from "node:fs/promises";
import type { DiagramSpec } from "../spec/index.js";
import type { Theme } from "../theme/index.js";
import { executable, ensureDir } from "../core/paths.js";
import { run } from "../core/process.js";

const q = (value: string) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
export function diagramToD2(spec: DiagramSpec, theme: Theme): string {
  const lines = [`direction: ${spec.direction}`, `vars: { d2-config: { layout-engine: dagre } }`, `classes: { node: { style.fill: "#${theme.colors.surface}"; style.stroke: "#${theme.colors.accent}"; style.font-color: "#${theme.colors.text}"; style.border-radius: 8 } }`];
  for (const node of spec.nodes) lines.push(`${node.id}: ${q(node.label)} { class: node }`);
  for (const edge of spec.edges) lines.push(`${edge.from} -> ${edge.to}${edge.label ? `: ${q(edge.label)}` : ""}`);
  return `${lines.join("\n")}\n`;
}
export async function renderD2(spec: DiagramSpec, theme: Theme, workDir: string, basename: string): Promise<string> { await ensureDir(workDir); const source = path.join(workDir, `${basename}.d2`), output = path.join(workDir, `${basename}.svg`); await writeFile(source, diagramToD2(spec, theme)); await run(executable("d2"), ["--layout", "dagre", "--theme", "0", source, output], workDir); return output; }
