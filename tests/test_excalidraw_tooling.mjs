import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";

import { insideWorktree } from "../.opencode/lib/excalidraw-tooling.ts";

const root = await mkdtemp(path.join(os.tmpdir(), "documents-canvas-root-"));
const outside = await mkdtemp(path.join(os.tmpdir(), "documents-canvas-outside-"));

try {
  await mkdir(path.join(root, "artifacts"));
  assert.equal(
    insideWorktree(root, "artifacts/diagram.excalidraw"),
    path.join(root, "artifacts", "diagram.excalidraw"),
  );
  assert.throws(() => insideWorktree(root, "../outside.excalidraw"), /Path escapes project/);

  await symlink(outside, path.join(root, "escape"));
  assert.throws(
    () => insideWorktree(root, "escape/diagram.excalidraw"),
    /Path escapes project/,
  );
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
}

console.log("[test] excalidraw tooling OK");
