#!/usr/bin/env bash

set -euo pipefail

failed=0

for dependency in bash python3 curl tar sha256sum uname realpath node corepack; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    printf '[documents-addon][preflight] missing required command: %s\n' "$dependency" >&2
    failed=1
  fi
done

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  printf '[documents-addon][preflight] unsupported platform: %s %s; currently supported: Linux x86_64\n' "$(uname -s)" "$(uname -m)" >&2
  failed=1
fi

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$node_major" -lt 22 ]]; then
    printf '[documents-addon][preflight] Node.js 22 or newer is required for Artifact Studio; found %s\n' "$(node --version)" >&2
    failed=1
  fi
fi

if [[ "$failed" -ne 0 ]]; then
  exit 2
fi

printf '[documents-addon][preflight] bootstrap prerequisites OK\n'
