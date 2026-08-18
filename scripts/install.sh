#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="${HOME}/.config/opencode"
RUNTIME_DIR="${HOME}/.local/share/super-turing-opencode-documents/runtime"
DRY_RUN=0
VALIDATE=1
ASSETS_ONLY=0
MANAGED_FILES=()

usage() {
  cat <<'EOF'
Usage: bash scripts/install.sh [options]

Options:
  --target-dir <path>    Target OpenCode config dir (default: ~/.config/opencode)
  --runtime-dir <path>   Managed Quarto and D2 runtime root
  --assets-only          Copy assets without downloading the runtime
  --dry-run              Show actions without changing files
  --no-validate          Skip opencode debug config
  -h, --help             Show this help
EOF
}

log() { printf '[documents-addon] %s\n' "$*"; }
warn() { printf '[documents-addon][warn] %s\n' "$*" >&2; }

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

manifest_value() {
  python3 - "$REPO_DIR/DOCUMENTS-MANIFEST.json" "$1" <<'PY'
import json
import pathlib
import sys

value = json.loads(pathlib.Path(sys.argv[1]).read_text())
for part in sys.argv[2].split("."):
    value = value[part]
print(value)
PY
}

load_managed_files() {
  mapfile -t MANAGED_FILES < <(
    python3 - "$REPO_DIR/DOCUMENTS-MANIFEST.json" <<'PY'
import json
import pathlib
import sys

data = json.loads(pathlib.Path(sys.argv[1]).read_text())
for item in data.get("managedFiles", []):
    print(item)
PY
  )
}

install_runtime() {
  local version asset url expected_sha version_dir current_link archive temp_dir actual_sha actual_version
  version="$(manifest_value runtime.version)"
  asset="$(manifest_value runtime.asset)"
  url="$(manifest_value runtime.url)"
  expected_sha="$(manifest_value runtime.sha256)"
  version_dir="$RUNTIME_DIR/quarto-$version"
  current_link="$RUNTIME_DIR/current"

  if [[ "$ASSETS_ONLY" -eq 1 ]]; then
    log 'Assets-only mode: managed Quarto runtime was not installed'
    return 0
  fi

  if [[ -x "$version_dir/bin/quarto" ]]; then
    actual_version="$($version_dir/bin/quarto --version)"
    if [[ "$actual_version" == "$version" ]]; then
      log "Quarto $version is already installed in $version_dir"
      run mkdir -p "$RUNTIME_DIR"
      run ln -sfn "quarto-$version" "$current_link"
      return 0
    fi
    printf 'Existing managed Quarto version mismatch in %s: expected %s, got %s\n' "$version_dir" "$version" "$actual_version" >&2
    exit 1
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "Dry-run: would download and verify $url"
    log "Dry-run: would install Quarto $version in $version_dir"
    return 0
  fi

  temp_dir="$(mktemp -d)"
  trap 'rm -rf "$temp_dir"' RETURN
  archive="$temp_dir/$asset"
  log "Downloading Quarto $version"
  curl --fail --location --silent --show-error "$url" --output "$archive"
  actual_sha="$(sha256sum "$archive" | cut -d' ' -f1)"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    printf 'Quarto archive checksum mismatch: expected %s, got %s\n' "$expected_sha" "$actual_sha" >&2
    exit 1
  fi

  mkdir -p "$temp_dir/extracted" "$RUNTIME_DIR"
  tar --warning=no-unknown-keyword -xzf "$archive" -C "$temp_dir/extracted" --strip-components=1
  [[ -x "$temp_dir/extracted/bin/quarto" ]] || {
    printf 'Downloaded Quarto archive has no executable bin/quarto\n' >&2
    exit 1
  }
  actual_version="$($temp_dir/extracted/bin/quarto --version)"
  [[ "$actual_version" == "$version" ]] || {
    printf 'Downloaded Quarto version mismatch: expected %s, got %s\n' "$version" "$actual_version" >&2
    exit 1
  }
  mv "$temp_dir/extracted" "$version_dir"
  ln -sfn "quarto-$version" "$current_link"
  trap - RETURN
  rm -rf "$temp_dir"
  log "Quarto $version installed in $version_dir"
}

install_diagram_runtime() {
  local version asset url expected_sha version_dir current_link archive temp_dir actual_sha actual_version
  version="$(manifest_value diagramRuntime.version)"
  asset="$(manifest_value diagramRuntime.asset)"
  url="$(manifest_value diagramRuntime.url)"
  expected_sha="$(manifest_value diagramRuntime.sha256)"
  version_dir="$RUNTIME_DIR/d2-$version"
  current_link="$RUNTIME_DIR/d2-current"

  if [[ "$ASSETS_ONLY" -eq 1 ]]; then
    log 'Assets-only mode: managed D2 runtime was not installed'
    return 0
  fi

  if [[ -x "$version_dir/bin/d2" ]]; then
    actual_version="$($version_dir/bin/d2 --version)"
    if [[ "${actual_version#v}" == "$version" ]]; then
      log "D2 $version is already installed in $version_dir"
      run mkdir -p "$RUNTIME_DIR"
      run ln -sfn "d2-$version" "$current_link"
      return 0
    fi
    printf 'Existing managed D2 version mismatch in %s: expected %s, got %s\n' "$version_dir" "$version" "$actual_version" >&2
    exit 1
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "Dry-run: would download and verify $url"
    log "Dry-run: would install D2 $version in $version_dir"
    return 0
  fi

  temp_dir="$(mktemp -d)"
  trap 'rm -rf "$temp_dir"' RETURN
  archive="$temp_dir/$asset"
  log "Downloading D2 $version"
  curl --fail --location --silent --show-error "$url" --output "$archive"
  actual_sha="$(sha256sum "$archive" | cut -d' ' -f1)"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    printf 'D2 archive checksum mismatch: expected %s, got %s\n' "$expected_sha" "$actual_sha" >&2
    exit 1
  fi

  mkdir -p "$temp_dir/extracted" "$RUNTIME_DIR"
  tar --warning=no-unknown-keyword -xzf "$archive" -C "$temp_dir/extracted" --strip-components=1
  [[ -x "$temp_dir/extracted/bin/d2" ]] || {
    printf 'Downloaded D2 archive has no executable bin/d2\n' >&2
    exit 1
  }
  actual_version="$($temp_dir/extracted/bin/d2 --version)"
  [[ "${actual_version#v}" == "$version" ]] || {
    printf 'Downloaded D2 version mismatch: expected %s, got %s\n' "$version" "$actual_version" >&2
    exit 1
  }
  mv "$temp_dir/extracted" "$version_dir"
  ln -sfn "d2-$version" "$current_link"
  trap - RETURN
  rm -rf "$temp_dir"
  log "D2 $version installed in $version_dir"
}

copy_assets() {
  local timestamp backup_dir rel src dst
  timestamp="$(date +%Y%m%d-%H%M%S)"
  backup_dir="$TARGET_DIR/.documents-addon-backups/$timestamp"
  for rel in "${MANAGED_FILES[@]}"; do
    src="$REPO_DIR/$rel"
    dst="$TARGET_DIR/$rel"
    [[ -f "$src" ]] || { printf 'Managed source missing: %s\n' "$src" >&2; exit 1; }
    if [[ -e "$dst" ]] && ! cmp -s "$src" "$dst"; then
      run mkdir -p "$(dirname -- "$backup_dir/$rel")"
      run cp "$dst" "$backup_dir/$rel"
    fi
    run mkdir -p "$(dirname -- "$dst")"
    run cp "$src" "$dst"
  done
}

write_marker() {
  local marker="$TARGET_DIR/.opencode-documents-addon.json"
  local version runtime_version runtime_path diagram_version diagram_path
  version="$(manifest_value version)"
  runtime_version="$(manifest_value runtime.version)"
  runtime_path="$RUNTIME_DIR/current/bin/quarto"
  diagram_version="$(manifest_value diagramRuntime.version)"
  diagram_path="$RUNTIME_DIR/d2-current/bin/d2"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "Dry-run: would write $marker"
    return 0
  fi
  python3 - "$marker" "$REPO_DIR" "$version" "$runtime_version" "$runtime_path" "$diagram_version" "$diagram_path" "$ASSETS_ONLY" <<'PY'
import datetime
import json
import pathlib
import sys

marker, repo, version, runtime_version, runtime_path, diagram_version, diagram_path, assets_only = sys.argv[1:]
payload = {
    "addonId": "documents",
    "version": version,
    "installedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "repoDir": repo,
    "runtime": {
        "managed": assets_only == "0",
        "name": "quarto",
        "version": runtime_version,
        "path": runtime_path,
    },
    "diagramRuntime": {
        "managed": assets_only == "0",
        "name": "d2",
        "version": diagram_version,
        "path": diagram_path,
    },
}
path = pathlib.Path(marker)
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(payload, indent=2) + "\n")
PY
}

validate_install() {
  if [[ "$VALIDATE" -ne 1 || "$DRY_RUN" -eq 1 ]]; then
    return 0
  fi
  if [[ "$TARGET_DIR" != "$HOME/.config/opencode" ]]; then
    warn 'Target is not the active global config; skipping opencode debug config'
    return 0
  fi
  if command -v opencode >/dev/null 2>&1; then
    opencode debug config >/dev/null
  else
    warn 'opencode not found; configuration was not runtime-validated'
  fi
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --target-dir) TARGET_DIR="$2"; shift 2 ;;
    --runtime-dir) RUNTIME_DIR="$2"; shift 2 ;;
    --assets-only) ASSETS_ONLY=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-validate) VALIDATE=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

target_real="$(realpath -m "$TARGET_DIR")"
runtime_real="$(realpath -m "$RUNTIME_DIR")"
for unsafe in / "$HOME"; do
  [[ "$target_real" != "$unsafe" ]] || { printf 'Unsafe target directory: %s\n' "$TARGET_DIR" >&2; exit 2; }
  [[ "$runtime_real" != "$unsafe" ]] || { printf 'Unsafe runtime directory: %s\n' "$RUNTIME_DIR" >&2; exit 2; }
done
[[ "$target_real" != "$runtime_real" ]] || { printf 'Target and runtime directories must be different\n' >&2; exit 2; }

bash "$SCRIPT_DIR/preflight.sh"
load_managed_files
log "Repo dir: $REPO_DIR"
log "Target dir: $TARGET_DIR"
log "Runtime dir: $RUNTIME_DIR"
install_runtime
install_diagram_runtime
copy_assets
write_marker
validate_install
log 'Documents addon installation finished; restart OpenCode to load the skill and command'
