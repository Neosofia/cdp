#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
exec npm run preview -- --host 0.0.0.0 --port "${PORT:-4173}"
