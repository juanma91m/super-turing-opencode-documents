import path from "node:path";
import { lstatSync, realpathSync } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

export function insideWorktree(root: string, candidate: string): string {
  const base = realpathSync(root);
  const lexical = path.resolve(base, candidate);
  const lexicalRelative = path.relative(base, lexical);
  if (lexicalRelative.startsWith("..") || path.isAbsolute(lexicalRelative)) {
    throw new Error(`Path escapes project: ${candidate}`);
  }

  let existing = lexical;
  const missing: string[] = [];
  while (existing !== base) {
    try {
      lstatSync(existing);
      break;
    } catch {
      missing.unshift(path.basename(existing));
      existing = path.dirname(existing);
    }
  }
  const resolved = path.resolve(realpathSync(existing), ...missing);
  const relative = path.relative(base, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes project: ${candidate}`);
  }
  return resolved;
}

async function canvasBinary(): Promise<string> {
  const marker = path.join(process.env.HOME ?? "", ".config/opencode/.opencode-documents-addon.json");
  const payload = JSON.parse(await readFile(marker, "utf8")) as {
    canvasRuntime?: { path?: string };
  };
  const installed = payload.canvasRuntime?.path;
  if (!installed || !(await isFile(installed))) {
    throw new Error("Excalidraw canvas runtime is not installed; reinstall the Documents addon");
  }
  return installed;
}

export async function runCanvas(
  worktree: string,
  args: string[],
  options: { stdin?: string; outputPath?: string } = {},
): Promise<string> {
  const binary = await canvasBinary();
  if (options.outputPath) {
    await mkdir(path.dirname(options.outputPath), { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: worktree,
      shell: false,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: "3000",
        EXPRESS_SERVER_URL: "http://127.0.0.1:3000",
        EXCALIDRAW_EXPORT_DIR: path.resolve(worktree),
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += data));
    child.stderr.on("data", (data) => (stderr += data));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || stderr.trim() || "ok");
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `Excalidraw canvas exited ${code}`));
      }
    });
    if (options.stdin !== undefined) child.stdin.end(options.stdin);
    else child.stdin.end();
  });
}
