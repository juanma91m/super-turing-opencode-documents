import { tool } from "@opencode-ai/plugin";
import { inside, runArtifact } from "../lib/artifact-tooling";

export default tool({
  description: "Verify a semantic-diagram delivery receipt against its adjacent artifacts and optional original specification.",
  args: {
    receipt: tool.schema.string().describe("Delivery receipt JSON path inside the project"),
    spec: tool.schema.string().optional().describe("Original specification path inside the project"),
  },
  async execute(args, context) {
    const command = ["verify-receipt", inside(context.worktree, args.receipt)];
    if (args.spec) command.push("--spec", inside(context.worktree, args.spec));
    return runArtifact(context.worktree, command);
  },
});
