#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Follow Docker Compose service logs with pretty-printed JSON lines.

Compose prefixes each line (for example, "cdp-authentication  | "); this script
strips that prefix, formats JSON, and passes non-JSON lines through unchanged.

Usage:
  ./scripts/compose-logs-json.sh [COMPOSE_FILE] [SERVICE...]

Examples:
  ./scripts/compose-logs-json.sh docker-compose.local.yml authentication
  ./scripts/compose-logs-json.sh docker-compose.dev.yml chat user
  ./scripts/compose-logs-json.sh docker-compose.local.yml
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

compose_file="${1:-docker-compose.local.yml}"
shift || true

if ! command -v jq >/dev/null 2>&1; then
  echo "compose-logs-json: jq is required (brew install jq)" >&2
  exit 1
fi

# --tail replays recent lines on connect; restart this script after `compose up
# --force-recreate` or the follow stream can go stale.
docker compose -f "$compose_file" logs -f --no-color --tail=25 "$@" \
  | sed -Eu 's/^[^|]+\| //' \
  | while IFS= read -r line; do
      printf '%s\n' "$line" | jq -R '. as $l | try ($l | fromjson) catch $l'
    done
