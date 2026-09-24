import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "../../core/process.js";
import type { ValidationFinding } from "./index.js";

const BROWSER_NAMES = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "chrome-headless-shell",
];

export interface SvgBrowserValidation {
  checks: string[];
  findings: ValidationFinding[];
  browser: string | null;
}

function pathExecutable(name: string): string | null {
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    const candidate = path.join(directory, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function browserExecutable(): string | null {
  const configured = process.env.ARTIFACT_BROWSER;
  if (configured && existsSync(configured)) return path.resolve(configured);
  for (const name of BROWSER_NAMES) {
    const executable = pathExecutable(name);
    if (executable) return executable;
  }
  return null;
}

function browserDocument(svgBase64: string, nonce: string, sourceName: string): string {
  const script = String.raw`
(() => {
  const findings = [];
  const checks = [];
  const sourceName = ${JSON.stringify(sourceName)};
  const finding = (severity, location, problem, recommendedFix) => findings.push({ severity, location, problem, recommendedFix });
  const label = (element) => {
    const step = element.getAttribute("data-step");
    if (step) return sourceName + "#step-" + step;
    const text = (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
    return sourceName + (text ? "#text:" + text : "#" + element.tagName.toLowerCase());
  };
  const finiteBox = (box) => [box.x, box.y, box.width, box.height].every(Number.isFinite);
  const outside = (box, view, tolerance = 0.75) => box.x < view.x - tolerance
    || box.y < view.y - tolerance
    || box.x + box.width > view.x + view.width + tolerance
    || box.y + box.height > view.y + view.height + tolerance;
  const encode = (value) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  };
  const result = (value) => { document.getElementById("qa-result").textContent = encode(value); };
  try {
    const encodedSource = atob(${JSON.stringify(svgBase64)});
    const source = new TextDecoder().decode(Uint8Array.from(encodedSource, (character) => character.charCodeAt(0)));
    const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
    if (parsed.querySelector("parsererror")) throw new Error("SVG parser rejected the document");
    parsed.querySelectorAll("script, foreignObject").forEach((element) => element.remove());
    parsed.querySelectorAll("*").forEach((element) => {
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith("on") || ((name === "href" || name.endsWith(":href")) && /^(?:javascript:|https?:|data:)/.test(value))) element.removeAttribute(attribute.name);
      }
    });
    const svg = document.importNode(parsed.documentElement, true);
    document.body.insertBefore(svg, document.getElementById("qa-result"));
    const view = svg.viewBox && svg.viewBox.baseVal;
    if (!view || !Number.isFinite(view.width) || !Number.isFinite(view.height) || view.width <= 0 || view.height <= 0) {
      finding("CRITICAL", sourceName, "SVG has no finite positive viewBox in the browser DOM", "Regenerate with renderer-owned canvas dimensions");
      result({ checks, findings });
      return;
    }
    checks.push("browser SVG parse", "browser viewBox bounds");

    const textElements = [...svg.querySelectorAll("text")].filter((element) => (element.textContent || "").trim());
    for (const element of textElements) {
      const box = element.getBBox();
      if (!finiteBox(box) || box.width <= 0 || box.height <= 0) {
        finding("MAJOR", label(element), "Visible text has empty or non-finite browser geometry", "Check font availability and regenerate the SVG");
      } else if (outside(box, view)) {
        finding("MAJOR", label(element), "Text extends outside the SVG viewBox", "Shorten or wrap the label and regenerate");
      }
    }
    checks.push("browser text geometry");

    const semantic = [...svg.querySelectorAll(".service-flow-step, .narrated-sequence-step")];
    const boxes = semantic.map((element) => ({ element, box: element.getBBox() }));
    for (const { element, box } of boxes) {
      if (!finiteBox(box) || box.width <= 0 || box.height <= 0) {
        finding("MAJOR", label(element), "A semantic diagram item has empty or non-finite browser geometry", "Repair the renderer-owned semantic group and regenerate");
      } else if (outside(box, view)) {
        finding("MAJOR", label(element), "A semantic diagram item extends outside the SVG viewBox", "Reduce content density or expand the renderer-owned canvas");
      }
    }
    for (let left = 0; left < boxes.length; left += 1) {
      for (let right = left + 1; right < boxes.length; right += 1) {
        const a = boxes[left], b = boxes[right];
        const overlapWidth = Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);
        const overlapHeight = Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
        if (overlapWidth > 1 && overlapHeight > 1) {
          finding("MAJOR", label(a.element) + " + " + label(b.element), "Two semantic diagram items overlap in browser geometry", "Increase semantic spacing or split the diagram into phases");
        }
      }
    }
    checks.push("browser semantic bounds", "browser semantic overlap");
    result({ checks, findings });
  } catch (error) {
    finding("CRITICAL", sourceName, "Browser SVG inspection failed: " + String(error), "Inspect the generated SVG and browser runtime, then retry");
    result({ checks, findings });
  }
})();`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'"><style>html,body{margin:0;padding:0;background:white}svg{display:block}</style></head><body><pre id="qa-result"></pre><script nonce="${nonce}">${script}</script></body></html>`;
}

export async function validateSvgInBrowser(file: string, browser = browserExecutable()): Promise<SvgBrowserValidation> {
  if (!browser) {
    return {
      browser: null,
      checks: [],
      findings: [{
        severity: "MINOR",
        location: file,
        problem: "Browser SVG geometry inspection was skipped because Chrome or Chromium is unavailable",
        recommendedFix: "Install or configure Chrome/Chromium with ARTIFACT_BROWSER, then rerun artifact check",
      }],
    };
  }
  const temporary = await mkdtemp(path.join(os.tmpdir(), "artifact-svg-browser-"));
  try {
    const source = await readFile(file);
    const nonce = randomBytes(18).toString("base64url");
    const html = path.join(temporary, "inspect.html");
    await writeFile(html, browserDocument(source.toString("base64"), nonce, path.basename(file)));
    const profile = path.join(temporary, "profile");
    const result = await run(browser, [
      "--headless",
      "--disable-gpu",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "--virtual-time-budget=1000",
      "--dump-dom",
      pathToFileURL(html).href,
    ], temporary);
    const encoded = /<pre id="qa-result">([^<]+)<\/pre>/.exec(result.stdout)?.[1]?.trim();
    if (!encoded) throw new Error("Browser did not return an SVG QA payload");
    const payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as { checks: string[]; findings: ValidationFinding[] };
    return { browser, checks: payload.checks, findings: payload.findings };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
