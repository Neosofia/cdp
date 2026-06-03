#!/usr/bin/env bash
# Merge User service base Cedar policies with CDP product overrides for runtime mounts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER_POLICIES="${USER_POLICIES:-$ROOT/../user/policies}"
OVERRIDES="${OVERRIDES:-$ROOT/policies/service-overrides/user}"
OUT="${OUT:-$ROOT/policies-packed/user}"

if [[ ! -d "$USER_POLICIES" ]]; then
  echo "User policy source not found: $USER_POLICIES" >&2
  echo "Set USER_POLICIES to the user repo policies/ directory." >&2
  exit 1
fi
if [[ ! -d "$OVERRIDES" ]]; then
  echo "CDP policy overrides not found: $OVERRIDES" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"
shopt -s nullglob
for file in "$USER_POLICIES"/*.cedar; do
  cp "$file" "$OUT/"
done
for file in "$OVERRIDES"/*.cedar; do
  cp "$file" "$OUT/"
done
shopt -u nullglob

count="$(find "$OUT" -maxdepth 1 -name '*.cedar' | wc -l | tr -d ' ')"
echo "Packed $count Cedar file(s) into $OUT"
