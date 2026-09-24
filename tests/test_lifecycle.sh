#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
TARGET_DIR="$TEMP_DIR/config"
RUNTIME_DIR="$TEMP_DIR/runtime"

mkdir -p "$TARGET_DIR"
printf '%s\n' '{"$schema":"https://opencode.ai/config.json","tools":{"artifact-service-flow":true,"artifact-narrated-sequence":true,"artifact-verify-receipt":true,"user-tool":true}}' > "$TARGET_DIR/opencode.json"

bash "$REPO_DIR/scripts/install.sh" \
  --target-dir "$TARGET_DIR" \
  --runtime-dir "$RUNTIME_DIR" \
  --assets-only \
  --no-validate

[[ -f "$TARGET_DIR/skills/publicacion-documental/SKILL.md" ]]
[[ -f "$TARGET_DIR/skills/form-design/SKILL.md" ]]
[[ -f "$TARGET_DIR/commands/publicar-documento.md" ]]
[[ -f "$TARGET_DIR/agents/documenter.md" ]]
[[ -f "$TARGET_DIR/tools/artifact-service-flow.ts" ]]
[[ -f "$TARGET_DIR/tools/artifact-narrated-sequence.ts" ]]
[[ -f "$TARGET_DIR/tools/artifact-verify-receipt.ts" ]]
[[ -f "$TARGET_DIR/documents/diagrams/templates/flujo-servicios/spec.json" ]]
[[ -f "$TARGET_DIR/documents/diagrams/templates/secuencia-narrada/spec.json" ]]
python3 - "$TARGET_DIR/opencode.json" <<'PY'
import json
import pathlib
import sys

config = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert config["tools"]["artifact-service-flow"] is False
assert config["tools"]["artifact-narrated-sequence"] is False
assert config["tools"]["artifact-verify-receipt"] is False
assert config["tools"]["user-tool"] is True
PY
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
python3 - "$TARGET_DIR/opencode.json" <<'PY'
import json
import pathlib
import sys

config = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert config["tools"]["artifact-service-flow"] is True
assert config["tools"]["artifact-narrated-sequence"] is True
assert config["tools"]["artifact-verify-receipt"] is True
assert config["tools"]["user-tool"] is True
PY

printf '[test] lifecycle OK\n'
