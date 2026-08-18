#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
TARGET_DIR="$TEMP_DIR/config"
RUNTIME_DIR="${TEST_RUNTIME_DIR:-$TEMP_DIR/runtime}"
WORK_DIR="$TEMP_DIR/work"
OUTPUT_DIR="$TEMP_DIR/output"

bash "$REPO_DIR/scripts/install.sh" \
  --target-dir "$TARGET_DIR" \
  --runtime-dir "$RUNTIME_DIR" \
  --no-validate

mkdir -p "$WORK_DIR/assets/generated"
cp "$REPO_DIR/documents/templates/trabajo-practico/template.qmd" "$WORK_DIR/documento.qmd"
cp "$REPO_DIR/documents/templates/trabajo-practico/style.typ" "$WORK_DIR/style.typ"
cp "$REPO_DIR/documents/diagrams/templates/flujo-proceso/diagram.d2" "$WORK_DIR/assets/flujo.d2"

python3 "$REPO_DIR/scripts/render_diagram.py" \
  --d2 "$RUNTIME_DIR/d2-current/bin/d2" \
  --source "$WORK_DIR/assets/flujo.d2" \
  --output-dir "$WORK_DIR/assets/generated" \
  --name flujo \
  --profile document-light \
  --format svg

python3 - "$WORK_DIR/documento.qmd" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
with path.open("a") as stream:
    stream.write("\n```{=tex}\n\\newpage\n```\n\n# Apéndice de QA\n\nPágina posterior al salto portable.\n\n![Flujo de prueba.](assets/generated/flujo.svg){#fig-flujo fig-alt=\"Flujo con validación y corrección.\" width=85%}\n")
PY

python3 "$REPO_DIR/scripts/publish_document.py" \
  --quarto "$RUNTIME_DIR/current/bin/quarto" \
  --source "$WORK_DIR/documento.qmd" \
  --output-dir "$OUTPUT_DIR" \
  --editable both

[[ -s "$OUTPUT_DIR/documento.pdf" ]]
[[ -s "$OUTPUT_DIR/documento.docx" ]]
[[ -s "$OUTPUT_DIR/documento.odt" ]]
[[ -s "$OUTPUT_DIR/publication-report.json" ]]
[[ -s "$WORK_DIR/assets/generated/flujo.svg" ]]
[[ -s "$WORK_DIR/assets/generated/flujo.diagram-report.json" ]]
compgen -G "$OUTPUT_DIR/qa/page-*.png" >/dev/null

python3 - "$OUTPUT_DIR/publication-report.json" "$OUTPUT_DIR/documento.odt" <<'PY'
import json
import pathlib
import shutil
import sys
import zipfile

report = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert report["qa"]["pageCount"] >= 2
assert len(report["editableQa"]) == 2
if shutil.which("libreoffice") or shutil.which("soffice"):
    assert all(item["status"] == "generated" for item in report["editableQa"])
    assert all(item["pageCount"] >= 2 for item in report["editableQa"])

with zipfile.ZipFile(sys.argv[2]) as odt:
    styles = odt.read("styles.xml").decode("utf-8")
    content = odt.read("content.xml").decode("utf-8")
    embedded = odt.namelist()
assert "Pagebreak" in styles
assert "Pagebreak" in content
assert "Liberation Serif" in styles
assert any(name.startswith("Pictures/") and name.endswith(".svg") for name in embedded)
PY

bash "$REPO_DIR/scripts/status.sh" \
  --target-dir "$TARGET_DIR" \
  --runtime-dir "$RUNTIME_DIR"

printf '[test] publish OK: %s\n' "$OUTPUT_DIR/documento.pdf"
