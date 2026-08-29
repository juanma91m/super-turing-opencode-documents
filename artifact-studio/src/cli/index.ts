#!/usr/bin/env node
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { Command } from "commander";
import { generate, loadSpec, type ArtifactFormat } from "../core/pipeline.js";
import { parseDocumentSpec, documentSpecJsonSchema } from "../spec/index.js";
import { previewArtifact } from "../qa/visual/index.js";
import { validateArtifact } from "../qa/structural/index.js";
import { resolveInside } from "../core/paths.js";

const program = new Command().name("artifact").description("Artifact Studio CLI").version("1.0.0");
const invocationRoot = path.resolve(process.env.INIT_CWD ?? process.cwd());
const cliPath = (candidate: string): string => resolveInside(invocationRoot, candidate);
program.command("generate").argument("<spec>").option("-f, --format <format>", "pdf|pptx|docx|all", "pdf").option("-o, --output <dir>", "output directory", "artifacts/output").option("--name <name>", "output basename").option("--theme <theme>", "theme override").action(async (specFile, options) => { const format = options.format as ArtifactFormat; if (!["pdf", "pptx", "docx", "all"].includes(format)) throw new Error(`Invalid format: ${format}`); const spec = await loadSpec(cliPath(specFile)); if (options.theme) spec.theme = options.theme; const outputs = await generate(parseDocumentSpec(spec), { format, outputDir: cliPath(options.output), basename: options.name }); for (const file of outputs) console.log(file); });
program.command("validate").argument("<spec>").action(async (specFile) => { const spec = parseDocumentSpec(JSON.parse(await readFile(cliPath(specFile), "utf8"))); console.log(JSON.stringify({ valid: true, title: spec.meta.title, sections: spec.sections.length }, null, 2)); });
program.command("check").argument("<artifact>").action(async (file) => { const result = await validateArtifact(cliPath(file)); console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1; });
program.command("preview").argument("<artifact>").option("-o, --output <dir>", "preview root", "artifacts/previews").action(async (file, options) => console.log(JSON.stringify(await previewArtifact(cliPath(file), cliPath(options.output)), null, 2)));
program.command("schema").option("-o, --output <file>", "schema output", "artifacts/document-spec.schema.json").action(async (options) => { const output = cliPath(options.output); await writeFile(output, `${JSON.stringify(documentSpecJsonSchema(), null, 2)}\n`); console.log(output); });
await program.parseAsync();
