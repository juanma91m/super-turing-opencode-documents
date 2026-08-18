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

mkdir -p "$WORK_DIR"
cp "$REPO_DIR/documents/templates/trabajo-practico/template.qmd" "$WORK_DIR/documento.qmd"
cp "$REPO_DIR/documents/templates/trabajo-practico/style.typ" "$WORK_DIR/style.typ"

python3 "$REPO_DIR/scripts/publish_document.py" \
  --quarto "$RUNTIME_DIR/current/bin/quarto" \
  --source "$WORK_DIR/documento.qmd" \
  --output-dir "$OUTPUT_DIR" \
  --editable both

[[ -s "$OUTPUT_DIR/documento.pdf" ]]
[[ -s "$OUTPUT_DIR/documento.docx" ]]
[[ -s "$OUTPUT_DIR/documento.odt" ]]
[[ -s "$OUTPUT_DIR/publication-report.json" ]]
compgen -G "$OUTPUT_DIR/qa/page-*.png" >/dev/null

bash "$REPO_DIR/scripts/status.sh" \
  --target-dir "$TARGET_DIR" \
  --runtime-dir "$RUNTIME_DIR"

printf '[test] publish OK: %s\n' "$OUTPUT_DIR/documento.pdf"
