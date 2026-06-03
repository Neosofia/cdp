"""Resolve MIGRATION_DATABASE_URL for CDP seed scripts (same URL as Alembic migrations)."""

from __future__ import annotations

import os
import socket
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]

SERVICE_ENV_FILES: dict[str, Path] = {
    "authentication": ROOT / ".authentication.env",
    "chat": ROOT / ".chat.env",
    "care-episode": ROOT / ".care-episode.env",
    "user": ROOT / ".user.env",
}

# docker-compose.local.yml / docker-compose.dev.yml host port mappings for host-side seeds.
DOCKER_POSTGRES_LOCAL_PORTS: dict[str, tuple[str, int]] = {
    "authentication": ("authentication-postgres", 5014),
    "chat": ("chat-postgres", 5001),
    "care-episode": ("care-episode-postgres", 5015),
    "user": ("user-postgres", 5018),
}


def read_env_file(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        values[key.strip()] = value.strip().strip("'\"")
    return values


def migration_url_for_host(url: str, service: str) -> str:
    mapping = DOCKER_POSTGRES_LOCAL_PORTS.get(service)
    if not mapping:
        return url
    docker_host, local_port = mapping
    parsed = urlparse(url)
    if parsed.hostname != docker_host:
        return url
    port = parsed.port or 5432
    try:
        socket.getaddrinfo(docker_host, port, type=socket.SOCK_STREAM)
        return url
    except OSError:
        pass
    host_port = f"{docker_host}:{port}"
    local_host_port = f"127.0.0.1:{local_port}"
    if host_port in url:
        return url.replace(host_port, local_host_port, 1)
    return url.replace(f"@{docker_host}/", f"@{local_host_port}/", 1)


def migration_database_url(service: str) -> str:
    url = os.getenv("MIGRATION_DATABASE_URL", "").strip()
    if not url:
        url = read_env_file(SERVICE_ENV_FILES[service]).get("MIGRATION_DATABASE_URL", "").strip()
    if not url:
        env_name = SERVICE_ENV_FILES[service].name
        raise RuntimeError(
            f"Missing MIGRATION_DATABASE_URL for {service}. "
            f"Export it or run: set -a && source {env_name} && set +a",
        )
    url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    return migration_url_for_host(url, service)
