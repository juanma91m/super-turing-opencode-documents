import path from "node:path";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function projectRoot(): string { let current = path.dirname(fileURLToPath(import.meta.url)); while (path.dirname(current) !== current) { if (existsSync(path.join(current, "package.json"))) return current; current = path.dirname(current); } throw new Error("Artifact Studio package root not found"); }
export function resolveInside(root: string, candidate: string): string {
  const base = path.resolve(root); const resolved = path.resolve(base, candidate);
  const relative = path.relative(base, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Path escapes allowed root: ${candidate}`);
  return resolved;
}
export async function ensureDir(dir: string): Promise<string> { await mkdir(dir, { recursive: true }); return dir; }
export function executable(name: "typst" | "d2"): string {
  const env = name === "typst" ? process.env.ARTIFACT_TYPST : process.env.ARTIFACT_D2;
  if (env) return env;
  const home = process.env.HOME ?? "";
  return name === "typst" ? path.join(home, ".local/share/super-turing-opencode-documents/runtime/current/bin/tools/x86_64/typst") : path.join(home, ".local/share/super-turing-opencode-documents/runtime/d2-current/bin/d2");
}
