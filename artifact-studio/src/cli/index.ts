#!/usr/bin/env node
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { Command } from "commander";
import { generate, loadSpec, type ArtifactFormat } from "../core/pipeline.js";
import { parseDocumentSpec, documentSpecJsonSchema } from "../spec/index.js";
import { previewArtifact } from "../qa/visual/index.js";
import { validateArtifact } from "../qa/structural/index.js";
import { resolveInside } from "../core/paths.js";
import { renderServiceFlowFiles, ServiceFlowSpecSchema, serviceFlowJsonSchema, type ServiceFlowFormat } from "../diagrams/service-flow.js";
import { renderNarratedSequenceFiles, NarratedSequenceSpecSchema, narratedSequenceJsonSchema, type NarratedSequenceFormat } from "../diagrams/narrated-sequence.js";
import { DiagramDeliveryError } from "../diagrams/delivery.js";
import { verifyDiagramReceipt } from "../diagrams/receipt.js";

const program = new Command().name("artifact").description("Artifact Studio CLI").version("1.0.0");
const invocationRoot = path.resolve(process.env.INIT_CWD ?? process.cwd());
const cliPath = (candidate: string): string => resolveInside(invocationRoot, candidate);
function reportDiagramFailure(error: unknown): boolean {
  if (!(error instanceof DiagramDeliveryError)) return false;
  console.error(JSON.stringify(error.toJSON(), null, 2));
  process.exitCode = 1;
  return true;
}
program.command("generate").argument("<spec>").option("-f, --format <format>", "pdf|pptx|docx|all", "pdf").option("-o, --output <dir>", "output directory", "artifacts/output").option("--name <name>", "output basename").option("--theme <theme>", "theme override").action(async (specFile, options) => { const format = options.format as ArtifactFormat; if (!["pdf", "pptx", "docx", "all"].includes(format)) throw new Error(`Invalid format: ${format}`); const spec = await loadSpec(cliPath(specFile)); if (options.theme) spec.theme = options.theme; const outputs = await generate(parseDocumentSpec(spec), { format, outputDir: cliPath(options.output), basename: options.name }); for (const file of outputs) console.log(file); });
program.command("validate").argument("<spec>").action(async (specFile) => { const spec = parseDocumentSpec(JSON.parse(await readFile(cliPath(specFile), "utf8"))); console.log(JSON.stringify({ valid: true, title: spec.meta.title, sections: spec.sections.length }, null, 2)); });
program.command("check").argument("<artifact>").action(async (file) => { const result = await validateArtifact(cliPath(file)); console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1; });
program.command("preview").argument("<artifact>").option("-o, --output <dir>", "preview root", "artifacts/previews").action(async (file, options) => console.log(JSON.stringify(await previewArtifact(cliPath(file), cliPath(options.output)), null, 2)));
program.command("schema").option("-o, --output <file>", "schema output", "artifacts/document-spec.schema.json").action(async (options) => { const output = cliPath(options.output); await writeFile(output, `${JSON.stringify(documentSpecJsonSchema(), null, 2)}\n`); console.log(output); });
program.command("service-flow").argument("<spec>").option("-f, --format <format>", "svg|png|pdf|all", "svg").option("-o, --output <dir>", "output directory", "artifacts/output").option("--name <name>", "output basename", "service-flow").action(async (specFile, options) => {
  const format = options.format as ServiceFlowFormat;
  if (!["svg", "png", "pdf", "all"].includes(format)) throw new Error(`Invalid service-flow format: ${format}`);
  const source = await readFile(cliPath(specFile));
  const spec = ServiceFlowSpecSchema.parse(JSON.parse(source.toString("utf8")));
  try {
    const files = await renderServiceFlowFiles(spec, cliPath(options.output), options.name, format, { sourceBytes: source });
    for (const file of files) console.log(file);
  } catch (error) {
    if (!reportDiagramFailure(error)) throw error;
  }
});
program.command("service-flow-schema").option("-o, --output <file>", "schema output", "artifacts/service-flow-spec.schema.json").action(async (options) => { const output = cliPath(options.output); await writeFile(output, `${JSON.stringify(serviceFlowJsonSchema(), null, 2)}\n`); console.log(output); });
program.command("narrated-sequence").argument("<spec>").option("-f, --format <format>", "svg|png|pdf|all", "svg").option("-o, --output <dir>", "output directory", "artifacts/output").option("--name <name>", "output basename", "narrated-sequence").action(async (specFile, options) => {
  const format = options.format as NarratedSequenceFormat;
  if (!["svg", "png", "pdf", "all"].includes(format)) throw new Error(`Invalid narrated-sequence format: ${format}`);
  const source = await readFile(cliPath(specFile));
  const spec = NarratedSequenceSpecSchema.parse(JSON.parse(source.toString("utf8")));
  try {
    const files = await renderNarratedSequenceFiles(spec, cliPath(options.output), options.name, format, { sourceBytes: source });
    for (const file of files) console.log(file);
  } catch (error) {
    if (!reportDiagramFailure(error)) throw error;
  }
});
program.command("narrated-sequence-schema").option("-o, --output <file>", "schema output", "artifacts/narrated-sequence-spec.schema.json").action(async (options) => { const output = cliPath(options.output); await writeFile(output, `${JSON.stringify(narratedSequenceJsonSchema(), null, 2)}\n`); console.log(output); });
program.command("verify-receipt").argument("<report>").option("--spec <file>", "original specification file").action(async (reportFile, options) => {
  const result = await verifyDiagramReceipt(cliPath(reportFile), {
    specificationPath: options.spec ? cliPath(options.spec) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
});
await program.parseAsync();
