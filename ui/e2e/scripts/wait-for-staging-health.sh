#!/usr/bin/env bash
# Poll staging API /health until all return HTTP 200 with status ok.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URLS_FILE="${E2E_STAGING_HEALTH_URLS_FILE:-${SCRIPT_DIR}/../staging-health-urls.txt}"
TIMEOUT_SEC="${E2E_STAGING_HEALTH_TIMEOUT_SEC:-300}"
INTERVAL_SEC="${E2E_STAGING_HEALTH_INTERVAL_SEC:-10}"
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

read_urls() {
  if [[ -n "${E2E_STAGING_HEALTH_URLS:-}" ]]; then
    printf '%s\n' "${E2E_STAGING_HEALTH_URLS}" | tr ',' '\n'
    return
  fi
  grep -v '^[[:space:]]*#' "$URLS_FILE" | grep -v '^[[:space:]]*$' || true
}

url_ready() {
  local url="$1"
  local code
  code="$(curl -sS -o "$BODY_FILE" -w "%{http_code}" --max-time 20 "$url" 2>/dev/null || echo "000")"
  if [[ "$code" != "200" ]]; then
    echo "  $url → HTTP $code"
    return 1
  fi
  if [[ "$url" == */health ]]; then
    if ! python3 - <<'PY' "$BODY_FILE"
import json, sys
path = sys.argv[1]
try:
    data = json.load(open(path))
except json.JSONDecodeError:
    sys.exit(0)
status = data.get("status")
if status not in (None, "ok"):
    sys.exit(1)
PY
    then
      echo "  $url → HTTP 200 but status not ok"
      return 1
    fi
  fi
  echo "  $url → ok"
  return 0
}

deadline=$((SECONDS + TIMEOUT_SEC))
attempt=0

while true; do
  attempt=$((attempt + 1))
  echo "Staging health attempt ${attempt} (timeout ${TIMEOUT_SEC}s)…"
  all_ok=true
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    if ! url_ready "$url"; then
      all_ok=false
    fi
  done < <(read_urls)

  if $all_ok; then
    echo "All staging health checks passed."
    exit 0
  fi

  if (( SECONDS >= deadline )); then
    echo "Timed out after ${TIMEOUT_SEC}s waiting for staging health."
    exit 1
  fi

  sleep "$INTERVAL_SEC"
done
