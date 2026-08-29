import path from "node:path";
import { mkdtemp, stat } from "node:fs/promises";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { generate, loadSpec } from "../src/core/pipeline.js";
import { validateArtifact } from "../src/qa/structural/index.js";
describe("golden renderers", () => { it("generate structurally valid PDF, PPTX and DOCX", async () => { const output = await mkdtemp(path.join(os.tmpdir(), "artifact-studio-")); const spec = await loadSpec(path.resolve("examples/executive-status/spec.json")); const files = await generate(spec, { format: "all", outputDir: output, basename: "integration" }); expect(files).toHaveLength(3); for (const file of files) { expect((await stat(file)).size).toBeGreaterThan(1000); expect((await validateArtifact(file)).valid).toBe(true); } }, 120000); });
