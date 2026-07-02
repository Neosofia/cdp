#!/bin/sh
# Regenerate committed OpenAPI TS clients from sibling service repos (local dev only).
# Skips quietly when no openapi.json sources are present (CI, ui-only checkouts).
set -eu

UI_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$UI_DIR"

found=0
had_missing=0

for entry in \
  "user:../../user/openapi.json:src/shared/api/generated/user.schema.ts" \
  "care-episode:../../care-episode/openapi.json:src/shared/api/generated/care-episode.schema.ts" \
  "chat:../../chat/openapi.json:src/shared/api/generated/chat.schema.ts" \
  "authentication:../../authentication/openapi.json:src/shared/api/generated/authentication.schema.ts" \
  "capabilities:../../capabilities/openapi.json:src/shared/api/generated/capabilities.schema.ts"
do
  rest=${entry#*:}
  src=${rest%%:*}
  if [ -f "$src" ]; then
    found=$((found + 1))
  fi
done

if [ "$found" -eq 0 ]; then
  echo "Skipping API schema sync (no sibling service openapi.json files found)."
  exit 0
fi

for entry in \
  "user:../../user/openapi.json:src/shared/api/generated/user.schema.ts" \
  "care-episode:../../care-episode/openapi.json:src/shared/api/generated/care-episode.schema.ts" \
  "chat:../../chat/openapi.json:src/shared/api/generated/chat.schema.ts" \
  "authentication:../../authentication/openapi.json:src/shared/api/generated/authentication.schema.ts" \
  "capabilities:../../capabilities/openapi.json:src/shared/api/generated/capabilities.schema.ts"
do
  service=${entry%%:*}
  rest=${entry#*:}
  src=${rest%%:*}
  if [ ! -f "$src" ]; then
    if [ "$had_missing" -eq 0 ]; then
      echo "Cannot sync API schemas; missing openapi.json for:" >&2
      had_missing=1
    fi
    echo "  - ${service} (${src})" >&2
  fi
done

if [ "$had_missing" -eq 1 ]; then
  echo "Check out all platform service repos next to cdp/ (full workspace)." >&2
  exit 1
fi

echo "Syncing API schemas from service openapi.json..."
for entry in \
  "user:../../user/openapi.json:src/shared/api/generated/user.schema.ts" \
  "care-episode:../../care-episode/openapi.json:src/shared/api/generated/care-episode.schema.ts" \
  "chat:../../chat/openapi.json:src/shared/api/generated/chat.schema.ts" \
  "authentication:../../authentication/openapi.json:src/shared/api/generated/authentication.schema.ts" \
  "capabilities:../../capabilities/openapi.json:src/shared/api/generated/capabilities.schema.ts"
do
  rest=${entry#*:}
  src=${rest%%:*}
  out=${rest#*:}
  pnpm exec openapi-typescript "$src" -o "$out"
done
echo "✅ API schemas synced."
