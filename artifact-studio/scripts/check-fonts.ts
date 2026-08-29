import { run } from "../src/core/process.js";
const families = ["IBM Plex Sans", "IBM Plex Serif", "IBM Plex Mono", "Noto Sans"];
for (const family of families) { try { const { stdout } = await run("fc-match", ["--format", "%{family}\n", family]); const matched = stdout.trim().split(",")[0]; console.log(`${family}: ${matched === family ? "available" : `fallback -> ${matched}`}`); } catch { console.log(`${family}: fontconfig unavailable`); } }
