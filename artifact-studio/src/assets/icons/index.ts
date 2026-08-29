import path from "node:path";
import { readFile } from "node:fs/promises";
import { projectRoot } from "../../core/paths.js";
const allowed = new Set(["circle-alert", "circle-check", "info", "triangle-alert", "arrow-right", "server", "database", "network"]);
export async function lucideSvg(name: string, color = "172033"): Promise<string> { if (!allowed.has(name)) throw new Error(`Lucide icon is not allowlisted: ${name}`); const file = path.join(projectRoot(), "node_modules/lucide-static/icons", `${name}.svg`); return (await readFile(file, "utf8")).replaceAll("currentColor", `#${color}`).replaceAll(/<svg([^>]*)>/, `<svg$1 role="img" aria-label="${name}">`); }
