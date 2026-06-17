#!/usr/bin/env bash
# Apply workspace.dsl structure to workspace.json while preserving diagram layouts.
#
# Usage:
#   sync_structurizr_workspace.sh          # merge (default; keeps layouts)
#   sync_structurizr_workspace.sh --reset  # full export; discards saved layouts
set -euo pipefail

RESET=false
if [ "${1:-}" = "--reset" ]; then
    RESET=true
elif [ -n "${1:-}" ]; then
    echo "Usage: $0 [--reset]" >&2
    exit 1
fi

ROOT="$(cd "$(dirname "$0")/../structurizr" && pwd)"
OUT_DIR="$(mktemp -d)"
trap 'rm -rf "$OUT_DIR"' EXIT

run_structurizr() {
    docker run --rm \
        -v "$ROOT:/data" \
        -v "$OUT_DIR:/out" \
        structurizr/structurizr:latest \
        "$@"
}

if [ "$RESET" = true ] || [ ! -f "$ROOT/workspace.json" ]; then
    run_structurizr export -w /data/workspace.dsl -f json -o /out
    cp "$OUT_DIR/workspace.json" "$ROOT/workspace.json"
    echo "Exported $ROOT/workspace.json from workspace.dsl (layouts reset)."
else
    run_structurizr merge -w /data/workspace.dsl -l /data/workspace.json -o /out/workspace.json
    cp "$OUT_DIR/workspace.json" "$ROOT/workspace.json"
    echo "Merged workspace.dsl into $ROOT/workspace.json (layouts preserved)."
fi
