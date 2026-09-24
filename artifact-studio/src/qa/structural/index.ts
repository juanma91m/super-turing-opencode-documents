import path from "node:path";
import { access, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { run } from "../../core/process.js";
import { validateSvgInBrowser } from "./svg-browser.js";
export interface ValidationFinding { severity: "CRITICAL" | "MAJOR" | "MINOR"; location: string; problem: string; recommendedFix: string; }
function available(command: string): boolean { return (process.env.PATH ?? "").split(path.delimiter).some((directory) => existsSync(path.join(directory, command))); }
export async function validateArtifact(file: string): Promise<{ valid: boolean; checks: string[]; findings: ValidationFinding[] }> {
  const checks: string[] = [], findings: ValidationFinding[] = []; try { await access(file); if ((await stat(file)).size === 0) throw new Error("empty"); } catch { return { valid: false, checks, findings: [{ severity: "CRITICAL", location: file, problem: "Artifact missing or empty", recommendedFix: "Render the artifact again" }] }; }
  const ext = path.extname(file).toLowerCase();
  try { if (ext === ".pdf") { if (available("qpdf")) { await run("qpdf", ["--check", file]); checks.push("qpdf --check"); } else { const result = await run("pdfinfo", [file]); checks.push("pdfinfo (qpdf unavailable)"); if (result.stderr.trim()) findings.push({ severity: "MINOR", location: file, problem: `pdfinfo warning: ${result.stderr.trim()}`, recommendedFix: "Recheck with qpdf when available; retain Typst accessibility tags unless stronger validation identifies corruption" }); } } else if (ext === ".pptx" || ext === ".docx") { await run("unzip", ["-t", file]); checks.push("OOXML ZIP integrity"); const required = ext === ".pptx" ? "ppt/presentation.xml" : "word/document.xml"; await run("unzip", ["-p", file, required]); checks.push(required); } else if (ext === ".svg") { const browserValidation = await validateSvgInBrowser(file); checks.push(...browserValidation.checks); findings.push(...browserValidation.findings); } else throw new Error(`Unsupported artifact: ${ext}`); } catch (error) { findings.push({ severity: "CRITICAL", location: file, problem: String(error), recommendedFix: "Inspect renderer output and regenerate" }); }
  return { valid: !findings.some((finding) => finding.severity === "CRITICAL" || finding.severity === "MAJOR"), checks, findings };
}
