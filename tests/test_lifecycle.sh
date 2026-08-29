#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
TARGET_DIR="$TEMP_DIR/config"
RUNTIME_DIR="$TEMP_DIR/runtime"

bash "$REPO_DIR/scripts/install.sh" \
  --target-dir "$TARGET_DIR" \
  --runtime-dir "$RUNTIME_DIR" \
  --assets-only \
  --no-validate

[[ -f "$TARGET_DIR/skills/publicacion-documental/SKILL.md" ]]
[[ -f "$TARGET_DIR/skills/form-design/SKILL.md" ]]
[[ -f "$TARGET_DIR/commands/publicar-documento.md" ]]
[[ -f "$TARGET_DIR/agents/documenter.md" ]]
[[ -f "$TARGET_DIR/.opencode-documents-addon.json" ]]

mkdir -p "$TARGET_DIR/agents"
printf '%s\n' 'obsolete agent' > "$TARGET_DIR/agents/artifact-studio.md"
bash "$REPO_DIR/scripts/install.sh" \
  --target-dir "$TARGET_DIR" \
  --runtime-dir "$RUNTIME_DIR" \
  --assets-only \
  --no-validate
[[ ! -e "$TARGET_DIR/agents/artifact-studio.md" ]]
[[ -f "$TARGET_DIR/agents/documenter.md" ]]

bash "$REPO_DIR/scripts/uninstall.sh" \
  --target-dir "$TARGET_DIR" \
  --runtime-dir "$RUNTIME_DIR"

[[ ! -e "$TARGET_DIR/skills/publicacion-documental/SKILL.md" ]]
[[ ! -e "$TARGET_DIR/skills/form-design/SKILL.md" ]]
[[ ! -e "$TARGET_DIR/commands/publicar-documento.md" ]]
[[ ! -e "$TARGET_DIR/agents/documenter.md" ]]
[[ ! -e "$TARGET_DIR/.opencode-documents-addon.json" ]]

printf '[test] lifecycle OK\n'
