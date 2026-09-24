import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { DiagramDiagnostic } from "./delivery.js";

const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const IntegritySchema = z.object({
  bytes: z.number().int().nonnegative(),
  sha256: Sha256Schema,
});
const DeliveryReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  ok: z.literal(true),
  command: z.literal("deliver"),
  kind: z.string().min(1),
  specification: IntegritySchema.extend({
    representation: z.enum(["source-bytes", "normalized-json"]),
  }),
  artifacts: z.array(IntegritySchema.extend({
    path: z.string().min(1),
    bytes: z.number().int().positive(),
  })).min(1).max(128),
  validation: z.object({
    checksPassed: z.number().int().nonnegative(),
    checkCount: z.number().int().nonnegative(),
    errors: z.literal(0),
    warnings: z.number().int().nonnegative(),
  }).passthrough(),
}).passthrough().superRefine((receipt, context) => {
  if (receipt.validation.checksPassed !== receipt.validation.checkCount) {
    context.addIssue({
      code: "custom",
      path: ["validation", "checksPassed"],
      message: "Delivery receipt does not report every deterministic check as passed",
    });
  }
});

type DeliveryReceipt = z.infer<typeof DeliveryReceiptSchema>;

interface IntegrityValue {
  bytes: number;
  sha256: string;
}

export interface ReceiptArtifactVerification {
  name: string;
  declaredPath: string;
  resolvedPath: string;
  status: "verified" | "missing" | "invalid" | "mismatch";
  expected: IntegrityValue;
  actual: IntegrityValue | null;
}

export interface ReceiptSpecificationVerification {
  checked: boolean;
  path: string | null;
  representation: "source-bytes" | "normalized-json" | null;
  status: "not-requested" | "verified" | "missing" | "invalid" | "mismatch";
  expected: IntegrityValue | null;
  actual: IntegrityValue | null;
}

export interface ReceiptVerificationResult {
  schemaVersion: 1;
  ok: boolean;
  command: "verify-receipt";
  receipt: string;
  kind: string | null;
  specification: ReceiptSpecificationVerification;
  artifacts: ReceiptArtifactVerification[];
  diagnostics: DiagramDiagnostic[];
}

export interface ReceiptVerificationOptions {
  specificationPath?: string;
}

function diagnostic(
  code: string,
  message: string,
  subject: Record<string, string | number>,
  evidence: Record<string, unknown>,
  supportedFixes: string[],
): DiagramDiagnostic {
  return { code, severity: "error", message, subject, evidence, supportedFixes };
}

function emptySpecification(): ReceiptSpecificationVerification {
  return {
    checked: false,
    path: null,
    representation: null,
    status: "not-requested",
    expected: null,
    actual: null,
  };
}

function invalidResult(reportPath: string, diagnostics: DiagramDiagnostic[]): ReceiptVerificationResult {
  return {
    schemaVersion: 1,
    ok: false,
    command: "verify-receipt",
    receipt: path.resolve(reportPath),
    kind: null,
    specification: emptySpecification(),
    artifacts: [],
    diagnostics,
  };
}

async function hashRegularFile(file: string): Promise<IntegrityValue> {
  const metadata = await lstat(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    const error = new Error("Path is not a regular file") as NodeJS.ErrnoException;
    error.code = "ENOTFILE";
    throw error;
  }
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    const buffer = chunk as Buffer;
    bytes += buffer.byteLength;
    hash.update(buffer);
  }
  return { bytes, sha256: hash.digest("hex") };
}

function integrityMatches(expected: IntegrityValue, actual: IntegrityValue): boolean {
  return expected.bytes === actual.bytes && expected.sha256 === actual.sha256;
}

function artifactName(declaredPath: string): string | null {
  if (declaredPath.endsWith(path.sep)) return null;
  const name = path.basename(declaredPath);
  return name && name !== "." && name !== ".." ? name : null;
}

async function verifySpecification(
  receipt: DeliveryReceipt,
  specificationPath: string | undefined,
  diagnostics: DiagramDiagnostic[],
): Promise<ReceiptSpecificationVerification> {
  const expected = { bytes: receipt.specification.bytes, sha256: receipt.specification.sha256 };
  if (!specificationPath) {
    return {
      checked: false,
      path: null,
      representation: receipt.specification.representation,
      status: "not-requested",
      expected,
      actual: null,
    };
  }
  const resolvedPath = path.resolve(specificationPath);
  try {
    const actual = await hashRegularFile(resolvedPath);
    const matches = integrityMatches(expected, actual);
    if (!matches) diagnostics.push(diagnostic(
      "receipt/specification-integrity-mismatch",
      "The supplied specification does not match the bytes bound by the delivery receipt.",
      { specification: resolvedPath },
      { expected, actual, representation: receipt.specification.representation },
      [receipt.specification.representation === "source-bytes"
        ? "verify the original specification file used by the CLI or regenerate the delivery"
        : "supply the exact normalized JSON bytes used by the library call or regenerate through the CLI"],
    ));
    return {
      checked: true,
      path: resolvedPath,
      representation: receipt.specification.representation,
      status: matches ? "verified" : "mismatch",
      expected,
      actual,
    };
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    const code = missing ? "receipt/specification-missing" : "receipt/specification-invalid";
    diagnostics.push(diagnostic(
      code,
      missing ? "The specification selected for verification does not exist." : "The specification selected for verification is not a regular readable file.",
      { specification: resolvedPath },
      { reason: String(error) },
      [missing ? "restore the original specification or select its correct path" : "select a regular non-symbolic-link specification file"],
    ));
    return {
      checked: true,
      path: resolvedPath,
      representation: receipt.specification.representation,
      status: missing ? "missing" : "invalid",
      expected,
      actual: null,
    };
  }
}

export async function verifyDiagramReceipt(reportPath: string, options: ReceiptVerificationOptions = {}): Promise<ReceiptVerificationResult> {
  const resolvedReport = path.resolve(reportPath);
  let reportBytes: Buffer;
  try {
    const metadata = await lstat(resolvedReport);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      return invalidResult(resolvedReport, [diagnostic(
        "receipt/report-invalid",
        "The selected receipt is not a regular file.",
        { receipt: resolvedReport },
        { symbolicLink: metadata.isSymbolicLink() },
        ["select a regular non-symbolic-link delivery receipt"],
      )]);
    }
    if (metadata.size > MAX_RECEIPT_BYTES) {
      return invalidResult(resolvedReport, [diagnostic(
        "receipt/report-too-large",
        "The selected receipt exceeds the supported size limit.",
        { receipt: resolvedReport },
        { bytes: metadata.size, maximumBytes: MAX_RECEIPT_BYTES },
        ["select the original compact JSON delivery receipt"],
      )]);
    }
    reportBytes = await readFile(resolvedReport);
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    return invalidResult(resolvedReport, [diagnostic(
      missing ? "receipt/report-missing" : "receipt/report-unreadable",
      missing ? "The selected delivery receipt does not exist." : "The selected delivery receipt could not be read.",
      { receipt: resolvedReport },
      { reason: String(error) },
      [missing ? "select an existing delivery receipt" : "check receipt permissions and retry"],
    )]);
  }

  let rawReceipt: unknown;
  try {
    rawReceipt = JSON.parse(reportBytes.toString("utf8"));
  } catch (error) {
    return invalidResult(resolvedReport, [diagnostic(
      "receipt/invalid-json",
      "The selected delivery receipt is not valid JSON.",
      { receipt: resolvedReport },
      { reason: String(error) },
      ["restore the original generated receipt or regenerate the delivery"],
    )]);
  }
  const parsed = DeliveryReceiptSchema.safeParse(rawReceipt);
  if (!parsed.success) {
    return invalidResult(resolvedReport, [diagnostic(
      "receipt/invalid-schema",
      "The selected JSON does not satisfy the delivery receipt v1 contract.",
      { receipt: resolvedReport },
      { issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) },
      ["select a generated delivery receipt with schemaVersion 1 and all checks passing"],
    )]);
  }

  const receipt = parsed.data;
  const diagnostics: DiagramDiagnostic[] = [];
  const artifacts: ReceiptArtifactVerification[] = [];
  const seenNames = new Set<string>();
  const reportDirectory = path.dirname(resolvedReport);
  for (const artifact of receipt.artifacts) {
    const expected = { bytes: artifact.bytes, sha256: artifact.sha256 };
    const name = artifactName(artifact.path);
    if (!name) {
      diagnostics.push(diagnostic(
        "receipt/artifact-name-invalid",
        "A receipt artifact does not provide a safe filename.",
        { artifact: artifact.path },
        {},
        ["regenerate the receipt with renderer-owned artifact names"],
      ));
      artifacts.push({ name: "", declaredPath: artifact.path, resolvedPath: reportDirectory, status: "invalid", expected, actual: null });
      continue;
    }
    const resolvedArtifact = path.join(reportDirectory, name);
    if (seenNames.has(name)) {
      diagnostics.push(diagnostic(
        "receipt/artifact-name-duplicate",
        "Two receipt artifacts resolve to the same adjacent filename.",
        { artifact: name },
        {},
        ["regenerate the receipt with unique artifact names"],
      ));
      artifacts.push({ name, declaredPath: artifact.path, resolvedPath: resolvedArtifact, status: "invalid", expected, actual: null });
      continue;
    }
    seenNames.add(name);
    try {
      const actual = await hashRegularFile(resolvedArtifact);
      const matches = integrityMatches(expected, actual);
      if (!matches) diagnostics.push(diagnostic(
        "receipt/artifact-integrity-mismatch",
        "An artifact no longer matches the bytes recorded by the delivery receipt.",
        { artifact: name },
        { expected, actual },
        ["restore the delivered artifact or regenerate the complete artifact set"],
      ));
      artifacts.push({ name, declaredPath: artifact.path, resolvedPath: resolvedArtifact, status: matches ? "verified" : "mismatch", expected, actual });
    } catch (error) {
      const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
      diagnostics.push(diagnostic(
        missing ? "receipt/artifact-missing" : "receipt/artifact-invalid",
        missing ? "A receipt artifact is missing beside the receipt." : "A receipt artifact is not a regular readable file.",
        { artifact: name },
        { path: resolvedArtifact, reason: String(error) },
        [missing ? "restore the artifact beside the receipt or regenerate the complete set" : "replace the entry with the original regular non-symbolic-link artifact"],
      ));
      artifacts.push({ name, declaredPath: artifact.path, resolvedPath: resolvedArtifact, status: missing ? "missing" : "invalid", expected, actual: null });
    }
  }

  const specification = await verifySpecification(receipt, options.specificationPath, diagnostics);
  return {
    schemaVersion: 1,
    ok: diagnostics.length === 0,
    command: "verify-receipt",
    receipt: resolvedReport,
    kind: receipt.kind,
    specification,
    artifacts,
    diagnostics,
  };
}
