import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderServiceFlowFiles, renderServiceFlowSvg, ServiceFlowSpecSchema } from "../src/diagrams/service-flow.js";

const fixture = {
  version: "1.0",
  title: "Flujo distribuido",
  subtitle: "Validación del renderer semántico",
  connectors: true,
  lanes: [
    { id: "origen", title: "Origen", components: [] },
    { id: "plataforma", title: "Plataforma", components: ["Frontend", "Backend"] },
    { id: "destino", title: "Destino", components: [] },
  ],
  steps: [
    { lane: "plataforma", actor: "Frontend", text: "Inicia la operación", code: "GET /api/recurso" },
    { lane: "plataforma", actor: "Backend", text: "Valida la solicitud" },
    { lane: "origen", text: "Devuelve información" },
    { lane: "destino", text: "Completa el flujo" },
  ],
};

describe("service-lane flow", () => {
  it("validates lane references and emits accessible numbered SVG", () => {
    expect(() => ServiceFlowSpecSchema.parse({ ...fixture, steps: [{ lane: "missing", text: "X" }] })).toThrow(/Unknown lane id/);
    const rendered = renderServiceFlowSvg(fixture);
    expect(rendered.svg).toContain('role="img"');
    expect(rendered.svg).toContain('data-step="4"');
    expect(rendered.svg).toContain("GET /api/recurso");
    expect(rendered.svg.match(/class="service-flow-connector"/g)).toHaveLength(3);
  });

  it("supports the numbered no-connectors variant", () => {
    const rendered = renderServiceFlowSvg({ ...fixture, connectors: false });
    expect(rendered.svg).not.toContain("service-flow-connector");
    expect(rendered.svg).not.toContain("service-flow-arrow");
  });

  it("renders canonical SVG plus PNG and one-page PDF", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "service-flow-test-"));
    const sourceBytes = Buffer.from(`${JSON.stringify(fixture, null, 2)}\n`);
    const files = await renderServiceFlowFiles(fixture, output, "flow", "all", { sourceBytes });
    expect(files.map((file) => path.extname(file))).toEqual([".svg", ".png", ".pdf", ".json"]);
    for (const file of files) expect((await stat(file)).size).toBeGreaterThan(200);
    expect(await readFile(path.join(output, "flow.svg"), "utf8")).toContain("Flujo distribuido");
    const receipt = JSON.parse(await readFile(path.join(output, "flow.service-flow-report.json"), "utf8"));
    expect(receipt).toMatchObject({
      schemaVersion: 1,
      ok: true,
      command: "deliver",
      kind: "service-flow",
      specification: {
        bytes: sourceBytes.byteLength,
        representation: "source-bytes",
        sha256: createHash("sha256").update(sourceBytes).digest("hex"),
      },
      validation: { errors: 0, warnings: 0 },
    });
    expect(receipt.validation.checksPassed).toBe(receipt.validation.checkCount);
    expect(receipt.artifacts).toHaveLength(3);
  }, 120000);

  it("preserves the previous artifact when deterministic validation fails", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "service-flow-last-good-test-"));
    const trusted = path.join(output, "flow.svg");
    await writeFile(trusted, "trusted artifact");
    const invalid = {
      ...fixture,
      lanes: [{ ...fixture.lanes[0], title: "X".repeat(120) }, ...fixture.lanes.slice(1)],
    };
    await expect(renderServiceFlowFiles(invalid, output, "flow", "svg")).rejects.toMatchObject({
      stage: "validation",
      diagnostics: expect.arrayContaining([expect.objectContaining({ code: "composition/label-fit" })]),
    });
    expect(await readFile(trusted, "utf8")).toBe("trusted artifact");
  });

  it("rejects output names that could escape the selected directory", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "service-flow-name-test-"));
    await expect(renderServiceFlowFiles(fixture, output, "../flow", "svg")).rejects.toThrow(/simple filename/);
  });
});
