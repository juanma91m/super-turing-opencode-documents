import { tool } from "@opencode-ai/plugin";
import { insideWorktree, runCanvas } from "../lib/excalidraw-tooling";

const actions = [
  "start",
  "status",
  "stop",
  "describe",
  "query",
  "add",
  "apply",
  "update",
  "delete",
  "clear",
  "screenshot",
  "export",
  "import",
  "snapshot-save",
  "snapshot-list",
  "snapshot-restore",
] as const;

export default tool({
  description: "Operate the local editable Excalidraw canvas, inspect/refine its scene, and persist project-scoped .excalidraw or image artifacts.",
  args: {
    action: tool.schema.enum(actions),
    payload: tool.schema.string().optional().describe("JSON for add, apply, or update"),
    elementId: tool.schema.string().optional().describe("Element id for update"),
    elementIds: tool.schema.array(tool.schema.string()).optional().describe("Element ids for delete"),
    path: tool.schema.string().optional().describe("Project-relative input/output path for screenshot, export, or import"),
    format: tool.schema.enum(["png", "svg"]).optional().describe("Screenshot format"),
    replace: tool.schema.boolean().default(false).describe("Replace the scene during import instead of appending"),
    confirmClear: tool.schema.boolean().default(false).describe("Must be true to clear the complete in-memory scene"),
    snapshot: tool.schema.string().optional().describe("Snapshot name for save/restore"),
  },
  async execute(args, context) {
    switch (args.action) {
      case "start":
      case "status":
      case "stop":
      case "describe":
      case "query":
        return runCanvas(context.worktree, [args.action]);
      case "clear":
        if (!args.confirmClear) throw new Error("clear requires confirmClear=true");
        return runCanvas(context.worktree, ["clear", "--yes"]);
      case "add":
      case "apply": {
        if (!args.payload) throw new Error(`${args.action} requires payload`);
        JSON.parse(args.payload);
        return runCanvas(context.worktree, [args.action, "-"], { stdin: args.payload });
      }
      case "update": {
        if (!args.elementId || !args.payload) throw new Error("update requires elementId and payload");
        JSON.parse(args.payload);
        return runCanvas(context.worktree, ["update", args.elementId, "--set", args.payload]);
      }
      case "delete": {
        if (!args.elementIds?.length) throw new Error("delete requires elementIds");
        return runCanvas(context.worktree, ["delete", ...args.elementIds]);
      }
      case "screenshot": {
        if (!args.path) throw new Error("screenshot requires a project-relative path");
        const output = insideWorktree(context.worktree, args.path);
        const format = args.format ?? (args.path.endsWith(".svg") ? "svg" : "png");
        return runCanvas(context.worktree, ["screenshot", "--format", format, "--out", output], { outputPath: output });
      }
      case "export": {
        if (!args.path) throw new Error("export requires a project-relative .excalidraw path");
        if (!args.path.endsWith(".excalidraw") && !args.path.endsWith(".excalidraw.md")) {
          throw new Error("export path must end in .excalidraw or .excalidraw.md");
        }
        const output = insideWorktree(context.worktree, args.path);
        return runCanvas(context.worktree, ["export", "--out", output], { outputPath: output });
      }
      case "import": {
        if (!args.path) throw new Error("import requires a project-relative path");
        const input = insideWorktree(context.worktree, args.path);
        const command = ["import", input];
        if (args.replace) command.push("--replace");
        return runCanvas(context.worktree, command);
      }
      case "snapshot-list":
        return runCanvas(context.worktree, ["snapshot", "list"]);
      case "snapshot-save":
      case "snapshot-restore": {
        if (!args.snapshot) throw new Error(`${args.action} requires snapshot`);
        const operation = args.action === "snapshot-save" ? "save" : "restore";
        return runCanvas(context.worktree, ["snapshot", operation, args.snapshot]);
      }
    }
  },
});
