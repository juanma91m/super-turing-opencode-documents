import { tool } from "@opencode-ai/plugin";
import { inside, runArtifact } from "../lib/artifact-tooling";

export default tool({ description: "Render a validated narrated sequence with lifelines, numbered steps and technical annotations.", args: { spec: tool.schema.string().describe("NarratedSequenceSpec JSON path inside the project"), format: tool.schema.enum(["svg", "png", "pdf", "all"]).default("all"), output: tool.schema.string().default("artifacts/output"), name: tool.schema.string().default("narrated-sequence") }, async execute(args, context) { return runArtifact(context.worktree, ["narrated-sequence", inside(context.worktree, args.spec), "--format", args.format, "--output", inside(context.worktree, args.output), "--name", args.name]); } });
