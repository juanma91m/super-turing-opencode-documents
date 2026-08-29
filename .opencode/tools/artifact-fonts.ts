import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";
import { studioRoot } from "../lib/artifact-tooling";
export default tool({ description: "Check whether IBM Plex and Noto fallback font families are available to Artifact Studio.", args: {}, async execute(_args, context) { const root = await studioRoot(context.worktree); return new Promise((resolve, reject) => { const child = spawn("corepack", ["pnpm", "-C", root, "exec", "tsx", "scripts/check-fonts.ts"], { cwd: context.worktree, shell: false }); let stdout = "", stderr = ""; child.stdout.on("data", (d) => stdout += d); child.stderr.on("data", (d) => stderr += d); child.on("error", reject); child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim()))); }); } });
