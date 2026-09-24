import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderServiceFlowFiles } from "../src/diagrams/service-flow.js";
import { verifyDiagramReceipt } from "../src/diagrams/receipt.js";

const fixture = {
  title: "Receipt verification",
  lanes: [
    { id: "client", title: "Client", components: ["Web"] },
    { id: "api", title: "API", components: ["Service"] },
  ],
  steps: [
    { lane: "client", actor: "User", text: "Starts the flow" },
    { lane: "api", text: "Processes the request" },
  ],
};

async function deliveredFixture(): Promise<{ output: string; receipt: string; spec: string; svg: string }> {
  const output = await mkdtemp(path.join(os.tmpdir(), "receipt-verification-test-"));
  const spec = path.join(output, "spec.json");
  const sourceBytes = Buffer.from(`${JSON.stringify(fixture, null, 2)}\n`);
  await writeFile(spec, sourceBytes);
  await renderServiceFlowFiles(fixture, output, "flow", "svg", { sourceBytes });
  return {
    output,
    receipt: path.join(output, "flow.service-flow-report.json"),
    spec,
    svg: path.join(output, "flow.svg"),
  };
}

describe("delivery receipt verification", () => {
  it("verifies adjacent artifacts and the exact source bytes", async () => {
    const delivered = await deliveredFixture();
    const result = await verifyDiagramReceipt(delivered.receipt, { specificationPath: delivered.spec });
    expect(result).toMatchObject({
      ok: true,
      command: "verify-receipt",
      kind: "service-flow",
      specification: { checked: true, status: "verified", representation: "source-bytes" },
      diagnostics: [],
    });
    expect(result.artifacts).toEqual([
      expect.objectContaining({ name: "flow.svg", status: "verified" }),
    ]);
  });

  it("detects an artifact modified after delivery", async () => {
    const delivered = await deliveredFixture();
    await writeFile(delivered.svg, `${await readFile(delivered.svg, "utf8")}\nmodified`);
    const result = await verifyDiagramReceipt(delivered.receipt, { specificationPath: delivered.spec });
    expect(result.ok).toBe(false);
    expect(result.artifacts[0]).toMatchObject({ name: "flow.svg", status: "mismatch" });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "receipt/artifact-integrity-mismatch" }));
  });

  it("detects a missing delivered artifact", async () => {
    const delivered = await deliveredFixture();
    await unlink(delivered.svg);
    const result = await verifyDiagramReceipt(delivered.receipt);
    expect(result.ok).toBe(false);
    expect(result.artifacts[0]).toMatchObject({ name: "flow.svg", status: "missing" });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "receipt/artifact-missing" }));
  });

  it("detects specification bytes that differ from the receipt", async () => {
    const delivered = await deliveredFixture();
    await writeFile(delivered.spec, `${await readFile(delivered.spec, "utf8")} `);
    const result = await verifyDiagramReceipt(delivered.receipt, { specificationPath: delivered.spec });
    expect(result.ok).toBe(false);
    expect(result.specification.status).toBe("mismatch");
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "receipt/specification-integrity-mismatch" }));
  });

  it("resolves declared artifacts beside the receipt instead of following external paths", async () => {
    const delivered = await deliveredFixture();
    const externalDirectory = await mkdtemp(path.join(os.tmpdir(), "receipt-external-artifact-test-"));
    const externalArtifact = path.join(externalDirectory, "external.svg");
    await writeFile(externalArtifact, await readFile(delivered.svg));
    const receipt = JSON.parse(await readFile(delivered.receipt, "utf8"));
    receipt.artifacts[0].path = externalArtifact;
    await writeFile(delivered.receipt, `${JSON.stringify(receipt, null, 2)}\n`);
    const result = await verifyDiagramReceipt(delivered.receipt);
    expect(result.ok).toBe(false);
    expect(result.artifacts[0]).toMatchObject({
      name: "external.svg",
      resolvedPath: path.join(delivered.output, "external.svg"),
      status: "missing",
    });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "receipt/artifact-missing" }));
  });

  it("rejects a receipt that no longer reports every check as passed", async () => {
    const delivered = await deliveredFixture();
    const receipt = JSON.parse(await readFile(delivered.receipt, "utf8"));
    receipt.validation.checksPassed -= 1;
    await writeFile(delivered.receipt, `${JSON.stringify(receipt, null, 2)}\n`);
    const result = await verifyDiagramReceipt(delivered.receipt);
    expect(result.ok).toBe(false);
    expect(result.kind).toBeNull();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "receipt/invalid-schema" }));
  });
});
