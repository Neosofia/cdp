# Operations Guide

This guide is for system administrators, software engineers, and testers wishing to run the entire CDP on their local machine. For cloud deployments, see [infrastructure/public-cloud/OPERATIONS.md](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/OPERATIONS.md) (platform JWT/networking) and the [public](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/RUNBOOK.md) or [private](https://github.com/Neosofia/infrastructure/blob/main/private-cloud/RUNBOOK.md) cloud runbooks.

## Prerequisites for local operations

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

## Local env setup

Before starting the services, a set of environment variable files must be generated in order to operate correctly. To promote Separation of Concerns (SoC) and adhere to Twelve-Factor App principles, all configuration is managed via `.env` files rather than hardcoded in the `docker-compose.dev.yml`.

For each service, copy its respective `.env.sample` file to a `.env` file and fill in the missing sensitive values (such as `YOUR_WORKOS_API_KEY` or `YOUR_SECRET`):

```bash
cp .authentication.env.sample .authentication.env
cp .authentication-postgres.env.sample .authentication-postgres.env
cp .capabilities.env.sample .capabilities.env
cp .template.env.sample .template.env
cp .user.env.sample .user.env
cp .user-postgres.env.sample .user-postgres.env
```

A service may also include helper scripts inside its docker image to simplify setup. For example, the authentication service provides a bootstrap container that generates its env file for you:

```bash
docker compose -f docker-compose.dev.yml run --rm authentication-bootstrap > .authentication.env
```

This runs `scripts/setup-env.py` inside the auth image, generates a local auth environment file, and writes it to the CDP repo root. The top-level compose file then mounts `.authentication.env` into the auth container as `/app/.env`.

After generation, fill in these required values manually in `.authentication.env`:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`

## UI policy bundle (capabilities)

CDP owns the UI entitlement policy bundle in `policies/`. The capabilities service loads this bundle at runtime from `/app/policies`; it ships no product-specific Cedar rules in its own repository.

**Production (sql-template pattern):**

1. CDP publishes a policy-only image: `ghcr.io/neosofia/cdp-ui-policies:vX.Y.Z`  
   Tag: `cdp-ui-policies/vX.Y.Z` → triggers `.github/workflows/cdp-ui-policies-build-push.yml`
2. Capabilities Dockerfile pins that tag (`COPY --from=ghcr.io/neosofia/cdp-ui-policies:vX.Y.Z`).
3. Bump the pinned tag / redeploy capabilities when the policy bundle version changes.

**One-time GHCR setup (same as `sql-template` → authentication):** after the first publish, open the [`cdp-ui-policies` package settings](https://github.com/orgs/Neosofia/packages/container/cdp-ui-policies/settings) and add the `capabilities` repository under **Manage Actions access → Add repository**.

**Local development:** volume-mount `cdp/policies/` over `/app/policies` (see `docker-compose.dev.yml`). No policy image required.

The bundle includes `entitlements.json` and `*.cedar` files. The UI calls `GET /api/v1/capabilities/ui`.

See [ADR 0012: UI Capabilities Control Plane](architecture/adrs/0012-ui-capabilities-control-plane.md).

## Public cloud staging

For cloud deployments, see the shared platform guide:

**→ [infrastructure/public-cloud/OPERATIONS.md](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/OPERATIONS.md)**

That document explains why local JWKS (`http://authentication:8014/...` in `.capabilities.env.sample`) differs from cloud routing, the two traffic planes (public browser vs private service mesh), and operational gotchas.

**CDP-specific staging checklist:**

| Component | Notes |
|-----------|-------|
| **UI policy bundle** | `cdp-ui-policies` GHCR image pinned in capabilities Dockerfile |
| **UI build args** | `VITE_CAPABILITIES_API_URL`, `VITE_AUTH_API_URL`, `VITE_USER_API_URL` — public HTTPS URLs |
| **Capabilities CORS** | `FRONTEND_URL` = public CDP UI origin |
| **Authentication** | `JWT_WEB_AUDIENCE` must include `capabilities` and `user`; explicit `PORT` for private JWKS refs |

See the Railway worked example in the infrastructure guide for `${{cdp.RAILWAY_PUBLIC_DOMAIN}}` and `${{authentication.RAILWAY_PRIVATE_DOMAIN}}` patterns.


## UI Service local dev

For the front-end interface, we use a distinct Dockerfile for the local development environment (`cdp/ui/Dockerfile.dev`). This development image installs `pnpm` directly using `npm` and binds the Vite dev server with Hot Module Replacement (HMR) to port 5173. 

The production image (`cdp/ui/Dockerfile`) isolates the static build into a pure runtime image hosting the `dist` directory via `serve`, dynamically responding to a provisioned `$PORT` or safely defaulting to 5173 (which ensures compatibility with deployment hosts like Railway).

## Start the Full Stack

Once you have generated all your environment variables, you can bring up the whole platform locally with this command:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Then access the platform at localhost:5173 (UI). Default API ports (8000 + spec number): Authentication **8014**, User **8018** (spec 018), Capabilities **8019**. Python template demo **8900** (outside the spec port range).

### Full stack from local service checkouts

When working across platform services, build everything from sibling repos instead of GHCR:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

`docker-compose.local.yml` includes `docker-compose.dev.yml` and points `authentication`, `capabilities`, `user`, and `python-template` at sibling repos. Configure the user service via `.user.env` and `.user-postgres.env` (see samples). The UI still builds from `cdp/ui`. Repos must sit next to `cdp/` in your workspace (same layout as the Neosofia multi-repo checkout).





