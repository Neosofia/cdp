#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
exec pnpm run preview -- --host 0.0.0.0 --port "${PORT:-4173}"
