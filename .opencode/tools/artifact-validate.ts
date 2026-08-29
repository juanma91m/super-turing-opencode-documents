import { tool } from "@opencode-ai/plugin";
import { inside, runArtifact } from "../lib/artifact-tooling";
import path from "node:path";
export default tool({ description: "Validate an Artifact Studio DocumentSpec schema or structurally check a rendered artifact.", args: { input: tool.schema.string().describe("Spec or artifact path inside the project"), kind: tool.schema.enum(["auto", "spec", "artifact"]).default("auto") }, async execute(args, context) { const input = inside(context.worktree, args.input), kind = args.kind === "auto" ? (path.extname(input) === ".json" ? "spec" : "artifact") : args.kind; return runArtifact(context.worktree, [kind === "spec" ? "validate" : "check", input]); } });
