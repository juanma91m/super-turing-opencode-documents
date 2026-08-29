import { spawn } from "node:child_process";
export async function run(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => { const child = spawn(command, args, { cwd, shell: false }); let stdout = "", stderr = ""; child.stdout.on("data", (d) => stdout += d); child.stderr.on("data", (d) => stderr += d); child.on("error", reject); child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} exited ${code}: ${stderr.trim()}`))); });
}
