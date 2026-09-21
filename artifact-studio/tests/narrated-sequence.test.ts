import path from "node:path";
import os from "node:os";
import { mkdtemp, stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { NarratedSequenceSpecSchema, renderNarratedSequenceFiles, renderNarratedSequenceSvg } from "../src/diagrams/narrated-sequence.js";

const fixture = {
  version: "1.0", title: "Secuencia", subtitle: "Prueba",
  participants: [{ id: "a", title: "A", kind: "actor" }, { id: "b", title: "B", group: "SISTEMA", kind: "service" }, { id: "db", title: "DB", kind: "database" }],
  steps: [
    { from: "a", to: "b", kind: "navigation", status: "existing", text: "Inicia" },
    { from: "b", to: "b", kind: "internal", status: "new", text: "Valida internamente" },
    { from: "b", to: "db", kind: "persistence", status: "new", text: "Persiste", code: "INSERT operation" },
  ], notes: ["Nota de prueba"],
};

describe("narrated sequence", () => {
  it("validates participant references and renders lifelines", () => { expect(() => NarratedSequenceSpecSchema.parse({ ...fixture, steps: [{ from: "missing", to: "b", text: "X" }] })).toThrow(/Unknown participant/); const rendered = renderNarratedSequenceSvg(fixture); expect(rendered.svg).toContain('data-step="3"'); expect(rendered.svg).toContain("stroke-dasharray"); expect(rendered.svg).toContain("SISTEMA"); });
  it("renders SVG, PNG and PDF", async () => { const output = await mkdtemp(path.join(os.tmpdir(), "narrated-sequence-test-")); const files = await renderNarratedSequenceFiles(fixture, output, "sequence", "all"); expect(files.map((file) => path.extname(file))).toEqual([".svg", ".png", ".pdf", ".json"]); for (const file of files) expect((await stat(file)).size).toBeGreaterThan(200); }, 120000);
  it("rejects unsafe output names", async () => { const output = await mkdtemp(path.join(os.tmpdir(), "narrated-sequence-name-")); await expect(renderNarratedSequenceFiles(fixture, output, "../sequence", "svg")).rejects.toThrow(/simple filename/); });
});
