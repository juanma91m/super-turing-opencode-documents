#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
RUNTIME_DIR="${HOME}/.local/share/super-turing-opencode-documents/runtime"
REMOVE_RUNTIME=0
DRY_RUN=0

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --target-dir) TARGET_DIR="$2"; shift 2 ;;
    --runtime-dir) RUNTIME_DIR="$2"; shift 2 ;;
    --remove-runtime) REMOVE_RUNTIME=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      printf 'Usage: bash scripts/uninstall.sh [--target-dir <path>] [--runtime-dir <path>] [--remove-runtime] [--dry-run]\n'
      exit 0
      ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 2 ;;
  esac
done

target_real="$(realpath -m "$TARGET_DIR")"
runtime_real="$(realpath -m "$RUNTIME_DIR")"
for unsafe in / "$HOME"; do
  [[ "$target_real" != "$unsafe" ]] || { printf 'Unsafe target directory: %s\n' "$TARGET_DIR" >&2; exit 2; }
  [[ "$runtime_real" != "$unsafe" ]] || { printf 'Unsafe runtime directory: %s\n' "$RUNTIME_DIR" >&2; exit 2; }
done
[[ "$target_real" != "$runtime_real" ]] || { printf 'Target and runtime directories must be different\n' >&2; exit 2; }

mapfile -t managed_files < <(
  python3 - "$REPO_DIR/DOCUMENTS-MANIFEST.json" <<'PY'
import json, pathlib, sys
manifest = pathlib.Path(sys.argv[1])
repo = manifest.parent
data = json.loads(manifest.read_text())
for item in data.get("managedFiles", []):
    print(f"{item}\t{item}")
for tree in data.get("managedTrees", []):
    source_root = repo / tree["source"]
    for source in sorted(path for path in source_root.rglob("*") if path.is_file()):
        print(f"{source.relative_to(repo)}\t{pathlib.Path(tree['target']) / source.relative_to(source_root)}")
PY
)

for mapping in "${managed_files[@]}"; do
  IFS=$'\t' read -r source_rel target_rel <<<"$mapping"
  source="$REPO_DIR/$source_rel"
  target="$TARGET_DIR/$target_rel"
  if [[ ! -e "$target" ]]; then
    continue
  fi
  if ! cmp -s "$source" "$target"; then
    printf '[documents-addon][warn] preserving modified managed file: %s\n' "$target" >&2
    continue
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] rm %s\n' "$target"
  else
    rm "$target"
  fi
done

marker="$TARGET_DIR/.opencode-documents-addon.json"
if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '[dry-run] rm -f %s\n' "$marker"
else
  rm -f "$marker"
fi

if [[ "$REMOVE_RUNTIME" -eq 1 ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] rm -rf %s\n' "$RUNTIME_DIR"
  else
    rm -rf "$RUNTIME_DIR"
  fi
fi

printf '[documents-addon] uninstall finished; backups and user documents were preserved\n'
