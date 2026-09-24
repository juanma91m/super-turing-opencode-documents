import { tool } from "@opencode-ai/plugin";
import { inside, runArtifact } from "../lib/artifact-tooling";

export default tool({ description: "Atomically deliver a validated narrated sequence, deterministic receipt and requested SVG/PNG/PDF outputs.", args: { spec: tool.schema.string().describe("NarratedSequenceSpec JSON path inside the project"), format: tool.schema.enum(["svg", "png", "pdf", "all"]).default("all"), output: tool.schema.string().default("artifacts/output"), name: tool.schema.string().default("narrated-sequence") }, async execute(args, context) { return runArtifact(context.worktree, ["narrated-sequence", inside(context.worktree, args.spec), "--format", args.format, "--output", inside(context.worktree, args.output), "--name", args.name]); } });
