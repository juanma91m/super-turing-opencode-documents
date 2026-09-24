import { createHash } from "node:crypto";
import path from "node:path";
import { lstat, mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";

export interface DiagramDiagnostic {
  code: string;
  severity: "error" | "warning";
  message: string;
  subject: Record<string, string | number>;
  evidence: Record<string, unknown>;
  supportedFixes: string[];
}

export interface DiagramCheck {
  name: string;
  ok: boolean;
  details: string[];
}

export interface DiagramValidation {
  checks: DiagramCheck[];
  diagnostics: DiagramDiagnostic[];
}

export interface DiagramDeliveryOptions {
  sourceBytes?: Uint8Array;
}

export class DiagramDeliveryError extends Error {
  constructor(
    public readonly kind: string,
    public readonly stage: "validation" | "build" | "prepare" | "commit",
    public readonly diagnostics: DiagramDiagnostic[],
    message = `Could not deliver ${kind}`,
  ) {
    super(message);
    this.name = "DiagramDeliveryError";
  }

  toJSON(): object {
    return {
      schemaVersion: 1,
      ok: false,
      command: "deliver",
      kind: this.kind,
      stage: this.stage,
      error: this.message,
      diagnostics: this.diagnostics,
    };
  }
}

export interface CandidateArtifact {
  name: string;
  path: string;
}

export interface DeliveryRequest {
  kind: string;
  title: string;
  outputDir: string;
  reportName: string;
  specification: Uint8Array;
  specificationRepresentation: "source-bytes" | "normalized-json";
  metadata: Record<string, unknown>;
  validation: DiagramValidation;
  build: (stagingDir: string) => Promise<CandidateArtifact[]>;
}

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function diagnostic(
  code: string,
  message: string,
  subject: Record<string, string | number>,
  evidence: Record<string, unknown>,
  supportedFixes: string[],
): DiagramDiagnostic {
  return { code, severity: "error", message, subject, evidence, supportedFixes };
}

async function assertRegularCandidate(kind: string, candidate: CandidateArtifact): Promise<void> {
  let metadata;
  try {
    metadata = await lstat(candidate.path);
  } catch (error) {
    throw new DiagramDeliveryError(kind, "build", [diagnostic(
      "delivery/candidate-missing",
      "A renderer did not produce the declared candidate artifact.",
      { artifact: candidate.name },
      { reason: String(error) },
      ["rerun the renderer after fixing the reported generation failure"],
    )]);
  }
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size === 0) {
    throw new DiagramDeliveryError(kind, "build", [diagnostic(
      "delivery/candidate-invalid",
      "A candidate artifact is not a non-empty regular file.",
      { artifact: candidate.name },
      { bytes: metadata.size, symbolicLink: metadata.isSymbolicLink() },
      ["regenerate the artifact as a non-empty regular file"],
    )]);
  }
}

async function commitSet(kind: string, stagingDir: string, outputDir: string, candidates: CandidateArtifact[]): Promise<void> {
  for (const candidate of candidates) {
    const simpleName = candidate.name === path.basename(candidate.name) && candidate.name !== "." && candidate.name !== "..";
    const relativeCandidate = path.relative(stagingDir, path.resolve(candidate.path));
    const staged = relativeCandidate !== "" && !path.isAbsolute(relativeCandidate) && relativeCandidate !== ".." && !relativeCandidate.startsWith(`..${path.sep}`);
    if (!simpleName || !staged) {
      throw new DiagramDeliveryError(kind, "prepare", [diagnostic(
        "delivery/path-containment",
        "A generated output escaped the private delivery staging directory.",
        { artifact: candidate.name },
        { candidatePath: candidate.path },
        ["use a simple output filename and keep candidates inside the renderer staging directory"],
      )]);
    }
  }
  const targets = candidates.map((candidate, index) => ({
    ...candidate,
    target: path.join(outputDir, candidate.name),
    backup: path.join(stagingDir, `.previous-${index}`),
  }));
  const uniqueTargets = new Set(targets.map((item) => item.target));
  if (uniqueTargets.size !== targets.length) {
    throw new DiagramDeliveryError(kind, "prepare", [diagnostic(
      "delivery/duplicate-target",
      "Two generated outputs resolve to the same target.",
      {},
      { targets: targets.map((item) => item.target) },
      ["use distinct output filenames"],
    )]);
  }

  for (const item of targets) {
    await assertRegularCandidate(kind, item);
    try {
      const existing = await lstat(item.target);
      if (!existing.isFile() || existing.isSymbolicLink()) {
        throw new DiagramDeliveryError(kind, "prepare", [diagnostic(
          "delivery/target-not-file",
          "An existing output target is not a regular file.",
          { artifact: item.name },
          { target: item.target, symbolicLink: existing.isSymbolicLink() },
          ["choose a regular-file target or move the conflicting filesystem entry"],
        )]);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  const backedUp: typeof targets = [];
  const committed: typeof targets = [];
  try {
    for (const item of targets) {
      try {
        await rename(item.target, item.backup);
        backedUp.push(item);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    for (const item of targets) {
      await rename(item.path, item.target);
      committed.push(item);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const item of [...committed].reverse()) {
      try { await unlink(item.target); } catch (rollbackError) {
        if ((rollbackError as NodeJS.ErrnoException).code !== "ENOENT") rollbackErrors.push(String(rollbackError));
      }
    }
    for (const item of [...backedUp].reverse()) {
      try { await rename(item.backup, item.target); } catch (rollbackError) { rollbackErrors.push(String(rollbackError)); }
    }
    throw new DiagramDeliveryError(kind, "commit", [diagnostic(
      rollbackErrors.length ? "delivery/rollback-failed" : "delivery/commit-failed",
      rollbackErrors.length
        ? "The artifact set could not be committed and its previous outputs were not fully restored."
        : "The artifact set could not be committed; previous outputs were restored.",
      {},
      { reason: String(error), rollbackErrors },
      ["check that every output target is writable and retry"],
    )]);
  }
}

export async function deliverDiagram(request: DeliveryRequest): Promise<string[]> {
  const errors = request.validation.diagnostics.filter((entry) => entry.severity === "error");
  const failedChecks = request.validation.checks.filter((check) => !check.ok);
  if (errors.length || failedChecks.length) {
    const diagnostics = errors.length ? request.validation.diagnostics : [diagnostic(
      "validation/check-failed",
      "A deterministic validation check failed without a more specific diagnostic.",
      { diagram: request.kind },
      { checks: failedChecks.map((check) => check.name) },
      ["inspect the failed checks and repair the semantic source before retrying"],
    )];
    throw new DiagramDeliveryError(
      request.kind,
      "validation",
      diagnostics,
      `${request.kind} failed deterministic validation`,
    );
  }

  await mkdir(request.outputDir, { recursive: true });
  const stagingDir = await mkdtemp(path.join(request.outputDir, ".artifact-delivery-"));
  try {
    let candidates: CandidateArtifact[];
    try {
      candidates = await request.build(stagingDir);
    } catch (error) {
      if (error instanceof DiagramDeliveryError) throw error;
      throw new DiagramDeliveryError(request.kind, "build", [diagnostic(
        "delivery/build-failed",
        "The renderer failed before producing a complete candidate set.",
        {},
        { reason: String(error) },
        ["fix the renderer input or runtime failure and retry"],
      )], `${request.kind} candidate generation failed`);
    }

    const artifacts = [];
    for (const candidate of candidates) {
      await assertRegularCandidate(request.kind, candidate);
      const bytes = await readFile(candidate.path);
      artifacts.push({
        path: path.join(request.outputDir, candidate.name),
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
      });
    }
    const checksPassed = request.validation.checks.filter((check) => check.ok).length;
    const receipt = {
      schemaVersion: 1,
      ok: true,
      command: "deliver",
      kind: request.kind,
      title: request.title,
      specification: {
        sha256: sha256(request.specification),
        bytes: request.specification.byteLength,
        representation: request.specificationRepresentation,
      },
      ...request.metadata,
      artifacts,
      validation: {
        checksPassed,
        checkCount: request.validation.checks.length,
        errors: 0,
        warnings: request.validation.diagnostics.filter((entry) => entry.severity === "warning").length,
        checks: request.validation.checks,
        diagnostics: request.validation.diagnostics,
      },
    };
    const reportPath = path.join(stagingDir, request.reportName);
    await writeFile(reportPath, `${JSON.stringify(receipt, null, 2)}\n`);
    const completeSet = [...candidates, { name: request.reportName, path: reportPath }];
    await commitSet(request.kind, stagingDir, request.outputDir, completeSet);
    return completeSet.map((candidate) => path.join(request.outputDir, candidate.name));
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

export function specificationBytes(value: unknown, options: DiagramDeliveryOptions): {
  bytes: Uint8Array;
  representation: "source-bytes" | "normalized-json";
} {
  if (options.sourceBytes) return { bytes: options.sourceBytes, representation: "source-bytes" };
  return { bytes: Buffer.from(`${JSON.stringify(value)}\n`, "utf8"), representation: "normalized-json" };
}
