import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { deliverDiagram } from "../src/diagrams/delivery.js";

describe("atomic diagram delivery", () => {
  it("preserves the last-good set and removes staging after a build failure", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "diagram-delivery-test-"));
    const trusted = path.join(output, "diagram.svg");
    await writeFile(trusted, "trusted");

    await expect(deliverDiagram({
      kind: "test-diagram",
      title: "Test",
      outputDir: output,
      reportName: "diagram.report.json",
      specification: Buffer.from("{}"),
      specificationRepresentation: "source-bytes",
      metadata: {},
      validation: { checks: [{ name: "fixture", ok: true, details: [] }], diagnostics: [] },
      build: async (stagingDir) => {
        await writeFile(path.join(stagingDir, "diagram.svg"), "candidate");
        throw new Error("renderer interrupted");
      },
    })).rejects.toMatchObject({ stage: "build" });

    expect(await readFile(trusted, "utf8")).toBe("trusted");
    expect((await readdir(output)).filter((entry) => entry.startsWith(".artifact-delivery-"))).toEqual([]);
  });

  it("restores every previous target when the commit is interrupted", async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), "diagram-delivery-rollback-test-"));
    const previous = {
      svg: path.join(output, "diagram.svg"),
      png: path.join(output, "diagram.png"),
      report: path.join(output, "diagram.report.json"),
    };
    await writeFile(previous.svg, "trusted svg");
    await writeFile(previous.png, "trusted png");
    await writeFile(previous.report, "trusted report");

    await expect(deliverDiagram({
      kind: "test-diagram",
      title: "Test",
      outputDir: output,
      reportName: "diagram.report.json",
      specification: Buffer.from("{}"),
      specificationRepresentation: "source-bytes",
      metadata: {},
      validation: { checks: [{ name: "fixture", ok: true, details: [] }], diagnostics: [] },
      build: async (stagingDir) => {
        const sharedCandidate = path.join(stagingDir, "candidate");
        await writeFile(sharedCandidate, "new artifact");
        return [
          { name: "diagram.svg", path: sharedCandidate },
          { name: "diagram.png", path: sharedCandidate },
        ];
      },
    })).rejects.toMatchObject({ stage: "commit" });

    expect(await readFile(previous.svg, "utf8")).toBe("trusted svg");
    expect(await readFile(previous.png, "utf8")).toBe("trusted png");
    expect(await readFile(previous.report, "utf8")).toBe("trusted report");
    expect((await readdir(output)).filter((entry) => entry.startsWith(".artifact-delivery-"))).toEqual([]);
  });
});
