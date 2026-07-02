#!/usr/bin/env bash
# Build the production UI image and smoke-test static serving (no platform APIs).
set -euo pipefail

UI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${CDP_UI_CONTAINER_IMAGE:-cdp-ui:container-test}"
PORT="${CDP_UI_CONTAINER_PORT:-8765}"
TIMEOUT_SEC="${CDP_UI_CONTAINER_TIMEOUT_SEC:-120}"

echo "Building ${IMAGE} from ${UI_DIR}…"
docker build -t "$IMAGE" -f "${UI_DIR}/Dockerfile" "$UI_DIR"

cid="$(docker run -d --rm -e "PORT=${PORT}" -p "${PORT}:${PORT}" "$IMAGE")"
trap 'docker rm -f "$cid" >/dev/null 2>&1 || true' EXIT

base_url="http://127.0.0.1:${PORT}"
deadline=$((SECONDS + TIMEOUT_SEC))

wait_for() {
  local url="$1"
  while (( SECONDS < deadline )); do
    if curl -sf --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for ${url}" >&2
  return 1
}

echo "Waiting for ${base_url}/ …"
wait_for "${base_url}/"

body="$(mktemp)"
trap 'docker rm -f "$cid" >/dev/null 2>&1 || true; rm -f "$body"' EXIT

curl -sf "${base_url}/" -o "$body"
if ! grep -q 'id="root"' "$body"; then
  echo "Expected SPA shell (id=\"root\") in GET / response" >&2
  exit 1
fi
echo "✅ Fetched SPA page."

curl -sf "${base_url}/favicon.svg" -o "$body"
if ! grep -q '<svg' "$body"; then
  echo "Expected static SVG in GET /favicon.svg response" >&2
  exit 1
fi
echo "✅ Fetched static favicon."

if ! docker inspect --format='{{.Config.User}}' "$cid" | grep -q '^app$'; then
  echo "Expected container to run as non-root user app" >&2
  exit 1
fi
echo "✅ Running as non-root user app."

health_deadline=$((SECONDS + 60))
while (( SECONDS < health_deadline )); do
  status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid" 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    echo "✅ Docker HEALTHCHECK reported healthy."
    echo "✅ Container smoke test passed."
    exit 0
  fi
  if [[ "$status" == "unhealthy" ]]; then
    echo "Docker HEALTHCHECK reported unhealthy" >&2
    docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' "$cid" >&2 || true
    exit 1
  fi
  sleep 2
done
echo "Timed out waiting for Docker HEALTHCHECK to become healthy" >&2
exit 1
