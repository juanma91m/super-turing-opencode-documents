import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
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
  it("masks intermediate lifelines across a multi-participant annotation stack", () => {
    const rendered = renderNarratedSequenceSvg({ ...fixture, steps: [{ from: "a", to: "db", text: "Cruza el participante intermedio", code: "GET /resource", note: "Nota" }] });
    expect(rendered.svg.match(/class="sequence-route-mask"/g)).toHaveLength(1);
    expect(rendered.validation.checks).toContainEqual(expect.objectContaining({ name: "intermediate_route_masks", ok: true }));
  });
  it("renders SVG, PNG and PDF with a deterministic delivery receipt", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "narrated-sequence-test-"));
    const files = await renderNarratedSequenceFiles(fixture, output, "sequence", "all");
    expect(files.map((file) => path.extname(file))).toEqual([".svg", ".png", ".pdf", ".json"]);
    for (const file of files) expect((await stat(file)).size).toBeGreaterThan(200);
    const receipt = JSON.parse(await readFile(path.join(output, "sequence.narrated-sequence-report.json"), "utf8"));
    expect(receipt).toMatchObject({
      schemaVersion: 1,
      ok: true,
      command: "deliver",
      kind: "narrated-sequence",
      specification: { representation: "normalized-json" },
      validation: { errors: 0 },
    });
    expect(receipt.validation.checksPassed).toBe(receipt.validation.checkCount);
    expect(receipt.artifacts).toHaveLength(3);
  }, 120000);
  it("keeps the last-good sequence when a participant label does not fit", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "narrated-sequence-last-good-test-"));
    const trusted = path.join(output, "sequence.svg");
    await writeFile(trusted, "trusted sequence");
    const invalid = { ...fixture, participants: [{ ...fixture.participants[0], title: "participant ".repeat(20) }, ...fixture.participants.slice(1)] };
    await expect(renderNarratedSequenceFiles(invalid, output, "sequence", "svg")).rejects.toMatchObject({
      stage: "validation",
      diagnostics: expect.arrayContaining([expect.objectContaining({ code: "composition/label-fit" })]),
    });
    expect(await readFile(trusted, "utf8")).toBe("trusted sequence");
  });
  it("rejects unsafe output names", async () => { const output = await mkdtemp(path.join(os.tmpdir(), "narrated-sequence-name-")); await expect(renderNarratedSequenceFiles(fixture, output, "../sequence", "svg")).rejects.toThrow(/simple filename/); });
});
