# Operations Guide

This guide is for system administrators, software engineers, and testers wishing to run the entire CDP on their local machine. For cloud deployments, see [infrastructure/public-cloud/OPERATIONS.md](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/OPERATIONS.md) (platform JWT/networking) and the [public](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/RUNBOOK.md) or [private](https://github.com/Neosofia/infrastructure/blob/main/private-cloud/RUNBOOK.md) cloud runbooks.

## Prerequisites for local operations

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

## Greenfield Step 0 (new environments)

Before expecting **Admin → Users** or operator registry APIs to work, complete [INSTALLATION_PLAN — Greenfield Step 0](INSTALLATION_PLAN.md#greenfield-step-0--assign-platform-registry-roles): one admin login (creates registry row with **`roles: []`**), SQL assignment of tier-2 roles on user Postgres, admin re-login, verify JWT `neosofia:roles`. Demo catalog users are seeded separately via [`scripts/seed_demo_platform.py`](scripts/seed_demo_platform.py); that script does not replace Step 0 for your real platform admin.

## Local env setup

Before starting the services, a set of environment variable files must be generated in order to operate correctly. To promote Separation of Concerns (SoC) and adhere to Twelve-Factor App principles, all runtime configuration is managed via per-service `.env` files (`env_file:` in compose) — not inline `environment:` blocks in `docker-compose.dev.yml` or `docker-compose.local.yml`. Compose may set `build.args` (image build wiring) and `volumes` (local policy hot-reload); it must not duplicate service config that belongs in `.env`.

For each service, copy its respective `.env.sample` file to a `.env` file and fill in the missing sensitive values (such as `YOUR_WORKOS_API_KEY` or `YOUR_SECRET`):

```bash
cp .authentication.env.sample .authentication.env
cp .authentication-postgres.env.sample .authentication-postgres.env
cp .capabilities.env.sample .capabilities.env
cp .template.env.sample .template.env
cp .user.env.sample .user.env
cp .user-postgres.env.sample .user-postgres.env
cp ui/.env.sample ui/.env
```

A service may also include helper scripts inside its docker image to simplify setup. For example, the authentication service provides a bootstrap container that generates its env file for you:

```bash
docker compose -f docker-compose.dev.yml run --rm authentication-bootstrap > .authentication.env
```

This runs `scripts/setup-env.py` inside the auth image, generates a local auth environment file, and writes it to the CDP repo root. The top-level compose file then mounts `.authentication.env` into the auth container as `/app/.env`.

`AUTHENTICATION_CLIENT_SECRET` is generated into that env file by the auth bootstrap script. If an operator provisions the env manually instead, they must supply it themselves. Authentication migration `002` now fails hard if this variable is blank so service-to-service provisioning cannot start half-configured.

After generation, fill in these required values manually in `.authentication.env`:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`

## UI policy bundle (capabilities)

CDP owns the UI entitlement policy bundle under `policies/capabilities/`. The capabilities service loads this bundle at runtime from `/app/policies`; it ships no product-specific Cedar rules in its own repository.

**Production (sql-template pattern):**

1. CDP publishes the platform policy image: `ghcr.io/neosofia/cdp-policies:vX.Y.Z`  
   Tag: `cdp-policies/vX.Y.Z` → triggers `.github/workflows/cdp-policies-build-push.yml`
2. Capabilities Dockerfile pins that tag via build arg **`POLICIES_IMAGE`** (default `ghcr.io/neosofia/cdp-policies:vX.Y.Z`) and copies `/policies/capabilities` → `/app/policies`.
3. Bump the pinned tag / redeploy capabilities when the policy bundle version changes.

**One-time GHCR setup (same as `sql-template` → authentication):** after the first publish, open the [`cdp-policies` package settings](https://github.com/Neosofia/packages/container/cdp-policies/settings) and add the `capabilities` and `user` repositories under **Manage Actions access → Add repository**.

**Local development:** `docker-compose.local.yml` builds `cdp-policies:local` and passes it as `POLICIES_IMAGE` at capabilities build time; optional volume-mount `./policies/capabilities/` over `/app/policies` for hot-reload. Pinned-release stacks in `docker-compose.dev.yml` use the same volume mount pattern.

The bundle includes `entitlements.json`, `menu/*.cedar`, and `features/*.cedar`. The UI calls `GET /api/v1/capabilities/ui`.

See [ADR 0012: UI Capabilities Control Plane](architecture/adrs/0012-ui-capabilities-control-plane.md).

## User service policy bundle

CDP owns product user policies under `policies/user/` (`role-catalog.json` and `cedar/*.cedar`). The **user** service loads generic Cedar from its own repo at `/app/policies`; CDP adds product vocabulary and tenant rules at image build time. CDP **never** builds, wraps, or deploys the user service image.

**Production (same `cdp-policies` image as capabilities):**

1. Publish **`cdp-policies/vX.Y.Z`** (same tag as capabilities).
2. User service Dockerfile pins that tag via `USER_PRODUCT_POLICIES_IMAGE` (default) and copies:
   - `/policies/user/role-catalog.json` → `/app/policies/role-catalog.json` (`ROLE_CATALOG_OVERLAY`)
   - `/policies/user/cedar/` → `/app/policies/`
3. Tag `user/v*` from [`Neosofia/user`](https://github.com/Neosofia/user) and deploy **`ghcr.io/neosofia/user`** for CDP stacks.

Non-CDP deployments: publish a bundle with the same `/policies/user/` layout and pass `USER_PRODUCT_POLICIES_IMAGE` at user image build.

**Local development:** `docker-compose.local.yml` builds `cdp-policies:local` and passes it to capabilities (`POLICIES_IMAGE`) and user (`USER_PRODUCT_POLICIES_IMAGE`) image builds. Product Cedar and the role catalog are baked into the user image at build; set **`ROLE_CATALOG_OVERLAY=/app/policies/role-catalog.json`** in `.user.env` (see `.user.env.sample`) — do not override it in compose. Optional: `./scripts/repack_user_service_policies.sh` writes `policies-packed/user/` for inspection.

## Public cloud staging

For cloud deployments, see the shared platform guide:

**→ [infrastructure/public-cloud/OPERATIONS.md](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/OPERATIONS.md)**

That document explains why local JWKS (`http://authentication:8014/...` in `.capabilities.env.sample`) differs from cloud routing, the two traffic planes (public browser vs private service mesh), and operational gotchas.

**CDP-specific staging checklist:**

| Component | Notes |
|-----------|-------|
| **UI policy bundle** | `cdp-policies` GHCR image pinned in capabilities Dockerfile (`/policies/capabilities`) |
| **User service** | Deploy `ghcr.io/neosofia/user:vX.Y.Z` (Dockerfile pins `USER_PRODUCT_POLICIES_IMAGE` for role catalog and product Cedar); Railway root = **user** repo |
| **UI build args** | `VITE_AUTH_BASE_URL`, `VITE_AUTH_API_URL`, `VITE_CAPABILITIES_API_URL`, `VITE_USER_API_URL`, `VITE_CHAT_API_URL`, `VITE_CARE_EPISODE_API_URL` — public HTTPS URLs (no trailing slash) |
| **Capabilities CORS** | `FRONTEND_URL` = public CDP UI origin |
| **Authentication** | `JWT_WEB_AUDIENCE` must include `capabilities`, `user`, `chat`, and `care-episode`; explicit `PORT` for private JWKS refs |
| **Chat / care-episode CORS** | Each service `FRONTEND_URL` = same public CDP UI origin |

See the Railway worked example in the infrastructure guide for `${{cdp.RAILWAY_PUBLIC_DOMAIN}}` and `${{authentication.RAILWAY_PRIVATE_DOMAIN}}` patterns.


## UI Service local dev

For the front-end interface, we use a distinct Dockerfile for the local development environment (`cdp/ui/Dockerfile.dev`). This development image installs `pnpm` directly using `npm` and binds the Vite dev server with Hot Module Replacement (HMR) to port 5173. 

The production image (`cdp/ui/Dockerfile`) isolates the static build into a pure runtime image hosting the `dist` directory via `serve`, dynamically responding to a provisioned `$PORT` or safely defaulting to 5173 (which ensures compatibility with deployment hosts like Railway).

## Start the Full Stack

Once you have generated all your environment variables, you can bring up the whole platform locally with this command:

```bash
docker compose -f docker-compose.dev.yml up -d --build
./scripts/compose-logs-json.sh docker-compose.dev.yml
```

Then access the platform at localhost:5173 (UI). Default API ports (8000 + spec number): Authentication **8014**, User **8018** (spec 018), Capabilities **8019**. Python template demo **8900** (outside the spec port range). In `ui/.env`, `VITE_TEMPLATE_API_URL` must point at the template service (**8900**), not the user service (**8018**).

### Full stack from local service checkouts

When working across platform services, build everything from sibling repos instead of GHCR:

```bash
docker compose -f docker-compose.local.yml build cdp-policies
docker compose -f docker-compose.local.yml up -d --build
./scripts/compose-logs-json.sh docker-compose.local.yml
```

Press `Ctrl+C` to stop following logs; containers keep running in the background.

### Viewing service logs (structured JSON)

Platform services emit one JSON object per log line. Raw `docker compose logs` output is hard to read because Compose adds a service prefix (`cdp-authentication  | `) before each line, and piping that prefix straight into `jq` fails (jq 1.7 surfaces parse errors instead of the original line).

Use the helper script to strip the prefix, pretty-print JSON, and pass non-JSON lines through unchanged:

```bash
./scripts/compose-logs-json.sh docker-compose.local.yml authentication
./scripts/compose-logs-json.sh docker-compose.dev.yml chat user
```

Requires `jq` (`brew install jq`). Equivalent one-liner:

Use `--no-color` so ANSI escape codes do not break JSON parsing. If the follower goes quiet after rebuilding containers, press `Ctrl+C` and start the script again — an existing `logs -f` session does not always reattach to recreated containers.
