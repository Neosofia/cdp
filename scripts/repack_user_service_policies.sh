#!/usr/bin/env bash
# Copy merged User service Cedar policies for local inspection / volume mounts.
# Production: user image COPY base policies/ from user repo; product bundle adds cedar/ + role-catalog.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USER_POLICIES="${USER_POLICIES:-$ROOT/../user/policies}"
PRODUCT_CEDAR="${PRODUCT_CEDAR:-$ROOT/policies/user/cedar}"
OUT="${OUT:-$ROOT/policies-packed/user}"

if [[ ! -d "$USER_POLICIES" ]]; then
  echo "User policy source not found: $USER_POLICIES" >&2
  echo "Set USER_POLICIES to the user repo policies/ directory." >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"
shopt -s nullglob
for file in "$USER_POLICIES"/*.cedar; do
  cp "$file" "$OUT/"
done
if [[ -d "$PRODUCT_CEDAR" ]]; then
  for file in "$PRODUCT_CEDAR"/*.cedar; do
    cp "$file" "$OUT/"
  done
fi
shopt -u nullglob

count="$(find "$OUT" -maxdepth 1 -name '*.cedar' | wc -l | tr -d ' ')"
echo "Packed $count Cedar file(s) into $OUT"
