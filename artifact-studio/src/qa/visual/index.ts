import path from "node:path";
import { pathToFileURL } from "node:url";
import { readdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { ensureDir } from "../../core/paths.js";
import { run } from "../../core/process.js";
export async function previewArtifact(file: string, previewRoot = path.resolve("artifacts/previews")): Promise<{ pages: string[]; contactSheet: string }> {
  const ext = path.extname(file).toLowerCase(), name = path.basename(file, ext), out = path.join(previewRoot, `${name}-${ext.slice(1)}`); await rm(out, { recursive: true, force: true }); await ensureDir(out); let pdf = file;
  if (ext === ".pptx" || ext === ".docx") { const profile = pathToFileURL(path.join(out, ".lo-profile")).href; await run("libreoffice", ["--headless", `-env:UserInstallation=${profile}`, "--convert-to", "pdf", "--outdir", out, file], out); pdf = path.join(out, `${name}.pdf`); }
  await run("pdftoppm", ["-png", "-r", "120", pdf, path.join(out, "page")], out); const pages = (await readdir(out)).filter((f) => /^page-\d+\.png$/.test(f)).sort().map((f) => path.join(out, f)); if (!pages.length) throw new Error("Preview produced no pages");
  const thumbs = await Promise.all(pages.map(async (p) => sharp(p).resize({ width: 360 }).png().toBuffer({ resolveWithObject: true }))); const cols = Math.min(4, thumbs.length), gap = 18, cellW = 360, cellH = Math.max(...thumbs.map((x) => x.info.height)) + 35, sheet = sharp({ create: { width: cols * cellW + (cols + 1) * gap, height: Math.ceil(thumbs.length / cols) * cellH + (Math.ceil(thumbs.length / cols) + 1) * gap, channels: 3, background: "#DDE2E8" } }); const composites = thumbs.map((x, i) => ({ input: x.data, left: gap + (i % cols) * (cellW + gap), top: gap + Math.floor(i / cols) * (cellH + gap) })); const contactSheet = path.join(out, "contact-sheet.png"); await sheet.composite(composites).png().toFile(contactSheet); return { pages, contactSheet };
}
