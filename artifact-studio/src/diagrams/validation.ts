import type { DiagramCheck, DiagramDiagnostic, DiagramValidation } from "./delivery.js";

interface SvgValidationInput {
  kind: string;
  svg: string;
  width: number;
  height: number;
  semanticClass: string;
  expectedSemanticCount: number;
  extraChecks?: DiagramCheck[];
  extraDiagnostics?: DiagramDiagnostic[];
}

export function errorDiagnostic(
  code: string,
  message: string,
  subject: Record<string, string | number>,
  evidence: Record<string, unknown>,
  supportedFixes: string[],
): DiagramDiagnostic {
  return { code, severity: "error", message, subject, evidence, supportedFixes };
}

export function check(name: string, ok: boolean, details: string[] = []): DiagramCheck {
  return { name, ok, details };
}

export function estimateTextWidth(value: string, fontSize: number): number {
  return [...value].reduce((total, character) => total + (character.codePointAt(0)! > 0x2ff ? fontSize : fontSize * 0.58), 0);
}

export function validateSvgComposition(input: SvgValidationInput): DiagramValidation {
  const diagnostics = [...(input.extraDiagnostics ?? [])];
  const finite = Number.isFinite(input.width)
    && Number.isFinite(input.height)
    && input.width > 0
    && input.height > 0
    && !/(?:NaN|Infinity|undefined)/.test(input.svg);
  if (!finite) diagnostics.push(errorDiagnostic(
    "composition/non-finite-geometry",
    "The generated SVG contains invalid or non-finite geometry.",
    { diagram: input.kind },
    { width: input.width, height: input.height },
    ["reduce invalid content and regenerate the diagram"],
  ));

  const accessible = input.svg.includes('role="img"')
    && /<title\s+id=/.test(input.svg)
    && /<desc\s+id=/.test(input.svg)
    && /aria-labelledby=/.test(input.svg);
  if (!accessible) diagnostics.push(errorDiagnostic(
    "artifact/accessibility-envelope",
    "The generated SVG is missing its accessible title, description or image role.",
    { diagram: input.kind },
    {},
    ["restore the renderer-owned SVG accessibility envelope"],
  ));

  const viewBox = `viewBox="0 0 ${input.width} ${input.height}"`;
  const bounded = input.svg.includes(viewBox);
  if (!bounded) diagnostics.push(errorDiagnostic(
    "composition/canvas-bounds",
    "The generated SVG viewBox does not match its computed canvas.",
    { diagram: input.kind },
    { expectedViewBox: viewBox },
    ["regenerate the diagram with renderer-owned canvas dimensions"],
  ));

  const semanticCount = input.svg.match(new RegExp(`class="${input.semanticClass}"`, "g"))?.length ?? 0;
  const semanticCountOk = semanticCount === input.expectedSemanticCount;
  if (!semanticCountOk) diagnostics.push(errorDiagnostic(
    "artifact/semantic-count",
    "The generated SVG does not contain every authored semantic item.",
    { diagram: input.kind },
    { expected: input.expectedSemanticCount, actual: semanticCount, semanticClass: input.semanticClass },
    ["restore the missing semantic item and regenerate"],
  ));

  return {
    checks: [
      check("finite_svg", finite),
      check("accessible_svg", accessible),
      check("canvas_bounds", bounded),
      check("semantic_count", semanticCountOk, [`${semanticCount}/${input.expectedSemanticCount} semantic items`]),
      ...(input.extraChecks ?? []),
    ],
    diagnostics,
  };
}
