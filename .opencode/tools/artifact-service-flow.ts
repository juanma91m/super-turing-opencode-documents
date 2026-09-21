import { tool } from "@opencode-ai/plugin";
import { inside, runArtifact } from "../lib/artifact-tooling";

export default tool({
  description: "Render a validated semantic service-lane flow to canonical SVG and optional PNG/PDF outputs.",
  args: {
    spec: tool.schema.string().describe("ServiceFlowSpec JSON path inside the project"),
    format: tool.schema.enum(["svg", "png", "pdf", "all"]).default("all"),
    output: tool.schema.string().default("artifacts/output").describe("Output directory inside the project"),
    name: tool.schema.string().default("service-flow").describe("Simple output basename"),
  },
  async execute(args, context) {
    const spec = inside(context.worktree, args.spec);
    const output = inside(context.worktree, args.output);
    return runArtifact(context.worktree, ["service-flow", spec, "--format", args.format, "--output", output, "--name", args.name]);
  },
});
