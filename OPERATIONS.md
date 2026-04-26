# Operations Guide

Local development and operational runbooks for the Clinical Data Platform (CDP).

For service-specific runbooks (environment variables, seed data, WorkOS setup, production deployment), see the `OPERATIONS.md` and `OPS-LOCAL.md` in each service directory — e.g. [services/authentication/OPS-LOCAL.md](services/authentication/OPS-LOCAL.md).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager

## Local env setup

The authentication container mounts `.dev.env` from the repo root into `/app/.local.env`.
The runtime auth service is configured to load that fixed file via `ENV_FILE=.local.env`.

Generate this file from the authentication helper baked into the auth image:

```bash
docker compose -f docker-compose.dev.yml run --rm authentication-bootstrap > .dev.env
```

This runs `scripts/setup-env.sh` inside the auth image and writes the generated environment file to the CDP repo root.

If an existing `.dev.env` file already exists, remove or back it up before regenerating so the helper can create a fresh local config.

After generation, fill in these required values manually in `.dev.env`:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`

Then verify the file contains the generated secrets.

> Note: the runtime auth service uses Docker Compose networking and overrides `DATABASE_URL` to point at the `auth-postgres` service. The `.dev.env` file may still contain `localhost:5014` for host-side tooling, but the container itself connects to `auth-postgres:5432`.

## Start the Full Stack

Run this after `.dev.env` has been generated and updated:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:

| Container | Purpose | URL |
|---|---|---|
| `cdp-traefik` | Local reverse proxy / API gateway | Dashboard: http://localhost:8090/dashboard/ |
| `cdp-authentication` | Authentication Service | http://auth.localhost or http://localhost:8014 |
| `cdp-auth-postgres` | Auth Service database | `localhost:5014` |

All services are accessible via clean `*.localhost` hostnames through Traefik — no port numbers needed in browser/frontend code.

---

## Common Tasks

### Rebuild after code changes

```bash
docker compose -f docker-compose.dev.yml up -d --build <service>
```

### Run tests for a service

```bash
cd services/<name> && uv run pytest
```

### Run a single service independently

Each service's `docker-compose.yml` is self-contained with its own database. Per-service compose files do **not** include shared infrastructure (Traefik, LocalStack secret seeding) — use the top-level file for integrated development.

---

## Adding a New Service to the Local Gateway

1. Add the service's container to its own `services/<name>/docker-compose.yml` and include it in `docker-compose.dev.yml`.
2. Add a router + service block to [`infra/traefik/dynamic/services.yml`](infra/traefik/dynamic/services.yml):

```yaml
http:
  routers:
    myservice:
      rule: "Host(`myservice.localhost`)"
      entryPoints: [web]
      service: myservice
  services:
    myservice:
      loadBalancer:
        servers:
          - url: "http://cdp-myservice:8000"
```

Traefik hot-reloads the file — no restart needed.
