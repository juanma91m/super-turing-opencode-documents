import path from "node:path";
import os from "node:os";
import { mkdtemp, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { browserExecutable, validateSvgInBrowser } from "../src/qa/structural/svg-browser.js";

const browser = browserExecutable();

describe("optional browser SVG geometry QA", () => {
  it("reports a non-blocking skipped check when no browser is configured", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "svg-browser-skipped-test-"));
    const svg = path.join(directory, "skipped.svg");
    await writeFile(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="10" y="20">Valid</text></svg>');
    const result = await validateSvgInBrowser(svg, null);
    expect(result.checks).toEqual([]);
    expect(result.findings).toEqual([
      expect.objectContaining({ severity: "MINOR", problem: expect.stringContaining("was skipped") }),
    ]);
  });
});

describe.skipIf(!browser)("browser SVG geometry QA", () => {
  it("accepts bounded text and semantic groups", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "svg-browser-valid-test-"));
    const svg = path.join(directory, "valid.svg");
    await writeFile(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="10" y="20">Valid</text><g class="service-flow-step" data-step="1"><rect x="10" y="30" width="30" height="20"/></g></svg>');
    const result = await validateSvgInBrowser(svg, browser);
    expect(result.findings).toEqual([]);
    expect(result.checks).toContain("browser text geometry");
    expect(result.checks).toContain("browser semantic overlap");
  });

  it("reports browser-measured overflow and semantic overlap", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "svg-browser-invalid-test-"));
    const svg = path.join(directory, "invalid.svg");
    await writeFile(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="98" y="20" font-size="18">Overflow</text><g class="service-flow-step" data-step="1"><rect x="70" y="30" width="25" height="25"/></g><g class="service-flow-step" data-step="2"><rect x="80" y="40" width="25" height="25"/></g></svg>');
    const result = await validateSvgInBrowser(svg, browser);
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "MAJOR", problem: "Text extends outside the SVG viewBox" }),
      expect.objectContaining({ severity: "MAJOR", problem: "A semantic diagram item extends outside the SVG viewBox" }),
      expect.objectContaining({ severity: "MAJOR", problem: "Two semantic diagram items overlap in browser geometry" }),
    ]));
  });
});
