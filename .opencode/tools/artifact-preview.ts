import { tool } from "@opencode-ai/plugin";
import { inside, runArtifact } from "../lib/artifact-tooling";
export default tool({ description: "Convert a local PDF, PPTX or DOCX to per-page PNG previews and a contact sheet.", args: { artifact: tool.schema.string().describe("Artifact path inside the project"), output: tool.schema.string().default("artifacts/previews") }, async execute(args, context) { const artifact = inside(context.worktree, args.artifact), output = inside(context.worktree, args.output); return runArtifact(context.worktree, ["preview", artifact, "--output", output]); } });
