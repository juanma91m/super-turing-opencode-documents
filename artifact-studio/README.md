# Artifact Studio

Artifact Studio is a local-first TypeScript framework that turns a semantic,
validated `DocumentSpec` into professional PDF, PPTX and DOCX artifacts.
Content is never expressed as arbitrary renderer coordinates.

## Quick start

```bash
corepack pnpm install
corepack pnpm artifact validate examples/executive-status/spec.json
corepack pnpm golden
corepack pnpm golden:qa
```

Final files are written to `artifacts/output/`; previews and contact sheets are
written to `artifacts/previews/`.

## Architecture

```text
request → storyline → DocumentSpec (Zod) → charts/diagrams
        → Typst | PptxGenJS | docx.js → structural checks
        → PNG previews → visual QA → fixes (max 3) → final artifact
```

- `src/spec/`: renderer-independent semantic model and exportable JSON Schema.
- `src/theme/`: typed design tokens (`executive-light` default,
  `executive-dark`, `technical-light`).
- `src/charts/`: chart policy, Vega-Lite → SVG/PNG, and native PPT chart data.
- `src/diagrams/`: safe DiagramSpec → D2 → SVG pipeline.
- `src/renderers/`: owned Typst template, semantic PPT layouts, editable DOCX,
  and gated optional Gamma adapter.
- `src/qa/`: OOXML/PDF checks, geometry checks, previews and contact sheets.
- `src/cli/`: standalone CLI used by OpenCode custom tools.

## Installation

Requirements: Node.js LTS (22+), Corepack/pnpm, fontconfig, LibreOffice,
Poppler (`pdftoppm`/`pdfinfo`) and unzip. `qpdf` improves PDF validation;
Graphviz is an optional fallback for dense graphs. The parent addon installs
verified user-space Typst (through Quarto) and D2 runtimes.

Debian/Ubuntu package names normally include:

```text
libreoffice poppler-utils qpdf fontconfig unzip graphviz
```

Artifact Studio does not invoke `sudo`. Install missing system packages through
the machine's approved administration workflow. Dependency build scripts are
deny-by-default; only reviewed `esbuild` and `sharp` scripts are allowed in
`pnpm-workspace.yaml`.

Run `corepack pnpm tsx scripts/check-fonts.ts`. IBM Plex is preferred; when it
is unavailable, Noto Sans is used without blocking generation. IBM Plex must
come from the distribution package manager or the official `IBM/plex` repo.

## CLI

```bash
corepack pnpm artifact generate spec.json --format pdf
corepack pnpm artifact generate spec.json --format pptx
corepack pnpm artifact generate spec.json --format docx
corepack pnpm artifact generate spec.json --format all
corepack pnpm artifact preview artifacts/output/report.pdf
corepack pnpm artifact check artifacts/output/deck.pptx
corepack pnpm artifact validate examples/executive-status/spec.json
corepack pnpm artifact schema
```

CLI inputs and outputs must remain below the current working directory. The
library API supports isolated temporary directories for tests.

## Artifact formats

### PDF

Typst is the primary and direct PDF renderer. The owned A4 template controls
cover, metadata, TOC, hierarchy, page furniture, tables, figures, captions,
callouts, page breaks and sources. It does not route through HTML, Pandoc or
LibreOffice.

### PPTX

PptxGenJS produces editable 16:9 OOXML using a central theme and semantic slide
masters for `TITLE`, `SECTION`, `AGENDA`, `EXECUTIVE_SUMMARY`, `KPI_GRID`,
`CONTENT`, `TWO_COLUMNS`, `TEXT_VISUAL`, `FULL_VISUAL`, `CHART`,
`CHART_WITH_INSIGHT`, `TABLE`, `ARCHITECTURE`, `PROCESS`, `TIMELINE`, `RISKS`,
`COMPARISON`, `QUOTE`, `CONCLUSION` and `APPENDIX`. Standard charts remain
native/editable. SVG is used for diagrams and non-native visualizations; slides
are never rasterized wholesale.

### DOCX

`DocxRenderer` exposes programmatic, template and auto strategies. The default
docx.js implementation creates a real editable Word document with named styles,
headings, headers/footers, page numbers, TOC fields, tables, lists, images,
captions and hyperlinks. The Docxtemplater adapter is opt-in for an explicit,
audited Word template. `DOCX_ENGINE=auto` falls back to docx.js if premium
modules are absent.

## DocumentSpec

`DocumentSpec` stores metadata, theme, sections, semantic blocks, sources and
assets. Supported blocks include paragraphs, headings, lists, quotes, callouts,
KPI grids, tables, charts, diagrams, images, code, comparisons, timelines,
risks, breaks and columns. It contains no PptxGenJS, Typst or docx.js options.
Run `artifact schema` to export JSON Schema. Missing information must be marked
as unavailable; never synthesize values.

## Charts

Chart specifications are persisted as JSON. Vega-Lite compiles them to vector
SVG; Sharp creates high-resolution PNG for DOCX compatibility. Standard PPT
bar/line/area/scatter/pie/doughnut charts stay native when appropriate. The
policy rejects decorative 3D/gauges, redirects crowded pies to bars, starts
bars at zero, preserves units and precision, and requires evidence for insights.

## Diagrams and icons

D2 is primary for architecture, process, infrastructure, sequence and
dependency diagrams; SVG is canonical. Graphviz is optional and Mermaid is an
interoperability fallback. Lucide SVG assets are loaded only through the
allowlisted helper in `src/assets/icons/`; emojis are not professional icons.

## Themes

Themes centralize colors, typography, spacing, radii, borders, chart palette,
page/slide geometry, tables and callouts. Add a theme by implementing the typed
`Theme` contract and registering it in `src/theme/index.ts`; do not copy tokens
into renderers.

## Adding a slide layout or renderer

Add layouts to the master registry and semantic selector, then test geometry
and render a representative slide. New renderers implement `ArtifactRenderer`
and consume only `RenderContext`; they must not mutate semantic content.

## OpenCode integration

The repository-local `.opencode/` overlay provides:

- primary agent `documenter` (the Artifact Studio orchestrator);
- bounded subagents for planning, editing, visualization, diagrams, rendering
  and read-only visual QA;
- nine focused skills with shared references, including `form-design` for
  evaluations, worksheets, checklists and other fillable forms;
- `/report`, `/deck`, `/docx`, `/artifact`, `/artifact-preview`,
  `/artifact-check`;
- typed tools `artifact-render`, `artifact-preview`, `artifact-validate`, and
  `artifact-fonts`.

The addon installer maps these assets into global OpenCode directories without
overwriting unrelated configuration. Restart OpenCode after installation.

## Visual and structural QA

PDF previews use `pdftoppm`. PPTX/DOCX are converted by isolated LibreOffice
headless profiles, then rasterized. Structural checks use qpdf when available
(pdfinfo fallback), OOXML ZIP integrity and required XML parts. Visual QA must
inspect every page/slide for overflow, clipping, overlap, margins, typography,
density, hierarchy, contrast and detached captions. Compilation alone is not a
quality gate.

## Optional integrations

- **Gamma:** the official asynchronous `v1.0/generations` adapter is gated by
  explicit request, explicit external-content approval and `GAMMA_API_KEY`;
  `GAMMA_THEME_ID` is optional. It uses preserve mode, no external images and
  16:9 output. Gamma is never the source of truth or the critical path, and
  potentially sensitive content is rejected.
- **Docxtemplater PRO:** the open-source template strategy works with an
  explicit audited DOCX. Licensed Image/HTML/Table/Chart/Styling/Subtemplate
  module instances can be supplied through `registerDocxtemplaterModules`;
  set `DOCXTEMPLATER_PRO=true` only after registration. Absence never breaks
  the local programmatic renderer.

## Troubleshooting

- `Typst/D2 not found`: run the parent addon's installer or set
  `ARTIFACT_TYPST` / `ARTIFACT_D2` to approved executables.
- `qpdf unavailable`: PDF validation falls back to `pdfinfo`; install qpdf for
  stronger checks.
- font warning: run `scripts/check-fonts.ts`; Noto Sans is the supported fallback.
- LibreOffice conversion failure: verify the file opens, ensure LibreOffice is
  installed and rerun preview with a clean output directory.
- OpenCode additions missing: restart OpenCode; configuration is loaded once.
