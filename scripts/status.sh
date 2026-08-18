#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
RUNTIME_DIR="${HOME}/.local/share/super-turing-opencode-documents/runtime"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --target-dir) TARGET_DIR="$2"; shift 2 ;;
    --runtime-dir) RUNTIME_DIR="$2"; shift 2 ;;
    -h|--help)
      printf 'Usage: bash scripts/status.sh [--target-dir <path>] [--runtime-dir <path>]\n'
      exit 0
      ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 2 ;;
  esac
done

python3 - "$REPO_DIR/DOCUMENTS-MANIFEST.json" "$REPO_DIR" "$TARGET_DIR" "$RUNTIME_DIR" <<'PY'
import json
import pathlib
import subprocess
import sys

manifest_path, repo_dir, target_dir, runtime_dir = map(pathlib.Path, sys.argv[1:])
data = json.loads(manifest_path.read_text())
missing = []
mismatched = []
for rel in data.get("managedFiles", []):
    source = repo_dir / rel
    target = target_dir / rel
    if not target.is_file():
        missing.append(rel)
    elif source.read_bytes() != target.read_bytes():
        mismatched.append(rel)

quarto = runtime_dir / "current/bin/quarto"
runtime_present = quarto.is_file() and quarto.stat().st_mode & 0o111
actual_version = ""
if runtime_present:
    actual_version = subprocess.run(
        [str(quarto), "--version"], check=False, text=True, capture_output=True
    ).stdout.strip()
expected_version = data["runtime"]["version"]
d2 = runtime_dir / "d2-current/bin/d2"
d2_present = d2.is_file() and d2.stat().st_mode & 0o111
d2_actual_version = ""
if d2_present:
    d2_actual_version = subprocess.run(
        [str(d2), "--version"], check=False, text=True, capture_output=True
    ).stdout.strip().removeprefix("v")
d2_expected_version = data["diagramRuntime"]["version"]
marker = target_dir / ".opencode-documents-addon.json"

print(f"addon_id={data['id']}")
print(f"addon_version={data['version']}")
print(f"install_marker_present={'yes' if marker.is_file() else 'no'}")
print(f"runtime_present={'yes' if runtime_present else 'no'}")
print(f"runtime_expected_version={expected_version}")
print(f"runtime_actual_version={actual_version or 'missing'}")
print(f"diagram_runtime_present={'yes' if d2_present else 'no'}")
print(f"diagram_runtime_expected_version={d2_expected_version}")
print(f"diagram_runtime_actual_version={d2_actual_version or 'missing'}")
print(f"managed_files_missing={len(missing)}")
print(f"managed_files_mismatched={len(mismatched)}")
for rel in missing:
    print(f"missing={rel}")
for rel in mismatched:
    print(f"mismatched={rel}")

healthy_assets = not missing and not mismatched and marker.is_file()
healthy_runtime = runtime_present and actual_version == expected_version
healthy_diagram_runtime = d2_present and d2_actual_version == d2_expected_version
raise SystemExit(0 if healthy_assets and healthy_runtime and healthy_diagram_runtime else 1)
PY
