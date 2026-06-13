#!/usr/bin/env python3
"""Register platform service credentials in the authentication database.

Uses MIGRATION_DATABASE_URL (same as authentication migrations), from the
environment or cdp/.authentication.env:

  set -a && source .authentication.env && set +a
  python scripts/seed_services.py

**base_url values below are for local Docker Compose** (`docker-compose.dev.yml` /
`docker-compose.local.yml` hostnames and spec ports).

On Railway and similar PaaS, override `base_url` when seeding the auth DB: use each
service's **public HTTPS URL** (no trailing slash), not `http://<slug>.railway.internal:…`.
Registry `base_url` is what callers use for outbound HTTP (login-time User provisioning,
care-episode → chat proxy, etc.). Internal hostnames often fail (Talisman redirects, mesh
reachability). See `cdp/INSTALLATION_PLAN.md` (user row HTTPS precedent) and
`infrastructure/public-cloud/OPERATIONS.md` (browser vs JWKS planes).

`JWT_JWKS_URI` on consumers may still point at the private mesh; that is separate from
registry `base_url`.
"""
from __future__ import annotations

import secrets
import sys
import uuid

import bcrypt
import psycopg
from psycopg.rows import dict_row

from seed_migration_url import migration_database_url

# Local Compose only — cloud/Railway: public HTTPS base_url per slug (see module docstring).
SERVICES_TO_SEED = [
    {
        "name": "Capabilities Service",
        "slug": "capabilities",
        "base_url": "http://capabilities:8019",
    },
    {
        "name": "User Service",
        "slug": "user",
        "base_url": "http://user:8018",  # cloud: https://<user-public-host>
    },
    {
        "name": "Care Episode Service",
        "slug": "care-episode",
        "base_url": "http://care-episode:8015",
    },
    {
        "name": "Chat Service",
        "slug": "chat",
        "base_url": "http://chat:8001",  # cloud: https://<chat-public-host>
    },
    {
        "name": "Python Template",
        "slug": "python-template",
        "base_url": "http://python-template:8900",
    },
]


def main() -> None:
    database_url = migration_database_url("authentication")
    print("Connecting to authentication database (MIGRATION_DATABASE_URL)...")
    try:
        conn = psycopg.connect(database_url, row_factory=dict_row)
    except psycopg.OperationalError as exc:
        print(f"Error connecting to database: {exc}")
        print(
            "Ensure authentication-postgres is running and MIGRATION_DATABASE_URL is set "
            "(set -a && source .authentication.env && set +a).",
        )
        sys.exit(1)

    print("\n--- Generating Service Credentials ---\n")

    env_output = []

    with conn.cursor() as cur:
        sys_uuid = uuid.UUID("00000000-0000-7000-8000-000000000000")

        for svc in SERVICES_TO_SEED:
            plain_secret = secrets.token_urlsafe(32)
            hashed_secret = bcrypt.hashpw(plain_secret.encode(), bcrypt.gensalt()).decode()

            cur.execute(
                """
                INSERT INTO services (name, slug, base_url, changed_by_uuid, changed_by_type)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE
                SET slug = EXCLUDED.slug, base_url = EXCLUDED.base_url
                RETURNING uuid;
                """,
                (svc["name"], svc["slug"], svc["base_url"], sys_uuid, 2),
            )

            service_uuid = cur.fetchone()["uuid"]

            cur.execute(
                """
                INSERT INTO service_credentials (service_uuid, hashed_secret, changed_by_uuid, changed_by_type)
                SELECT %s, %s, %s, %s
                WHERE NOT EXISTS (
                    SELECT 1 FROM service_credentials WHERE service_uuid = %s
                );
                """,
                (service_uuid, hashed_secret, sys_uuid, 2, service_uuid),
            )

            env_var_prefix = svc["slug"].replace("-", "_").upper()
            env_output.append(f"# {svc['name']}")
            env_output.append(f"{env_var_prefix}_CLIENT_ID={svc['slug']}")
            env_output.append(f"{env_var_prefix}_CLIENT_SECRET={plain_secret}\n")

            print(f"✅ Registered: {svc['name']} (slug: {svc['slug']})")

        conn.commit()

    conn.close()

    print("\n--- Add these to your .env files ---\n")
    print("\n".join(env_output))


if __name__ == "__main__":
    main()
