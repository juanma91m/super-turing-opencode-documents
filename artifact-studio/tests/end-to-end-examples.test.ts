import path from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderServiceFlowSvg } from "../src/diagrams/service-flow.js";
import { renderNarratedSequenceSvg } from "../src/diagrams/narrated-sequence.js";

const examples = [
  { name: "checkout-service-flow", renderer: renderServiceFlowSvg },
  { name: "incident-service-flow", renderer: renderServiceFlowSvg },
  { name: "order-saga-sequence", renderer: renderNarratedSequenceSvg },
  { name: "token-refresh-sequence", renderer: renderNarratedSequenceSvg },
] as const;

describe("end-to-end documenter examples", () => {
  for (const example of examples) {
    it(`${example.name} passes deterministic SVG validation`, async () => {
      const spec = JSON.parse(await readFile(path.resolve("examples/end-to-end", example.name, "spec.json"), "utf8"));
      const rendered = example.renderer(spec);
      expect(rendered.validation.diagnostics).toEqual([]);
      expect(rendered.validation.checks.every((check) => check.ok)).toBe(true);
      expect(rendered.svg).toContain('role="img"');
    });
  }
});
