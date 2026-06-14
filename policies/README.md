# CDP policy bundle

CDP-owned authorization artifacts for platform services. Cedar rules and JSON companions live here; product services load them at build or deploy time rather than shipping CDP vocabulary in their own repositories.

Published as a single image: **`ghcr.io/neosofia/cdp-policies`** (tag `cdp-policies/vX.Y.Z`).

## Layout

| Path | Consumer | Purpose |
|------|----------|---------|
| [`capabilities/entitlements.json`](capabilities/entitlements.json) | **Capabilities** | Maps UI entitlement keys to Cedar resources/actions |
| [`capabilities/menu/*.cedar`](capabilities/menu/) | **Capabilities** | Menu visibility rules (`ui::Menu`) |
| [`capabilities/features/*.cedar`](capabilities/features/) | **Capabilities** | Feature gates (`ui::Feature`, e.g. tenant user admin) |
| [`user/role-catalog.json`](user/role-catalog.json) | **User**, **CDP UI** | Clinical tier-2 labels, assignable slugs, job functions, UI actor defaults |
| [`user/cedar/*.cedar`](user/cedar/) | **User** | CDP product Cedar (platform, site, sponsor, demo sandbox) |

Generic user-service Cedar stays in the [user](https://github.com/Neosofia/user) repo (`policies/default.cedar`). Role vocabulary ships only via `ROLE_CATALOG_OVERLAY` (`user/role-catalog.json`).

## Role catalog (`user/role-catalog.json`)

| Consumer | How it uses this file |
|----------|------------------------|
| **CDP UI** | Bundled at build time via `@policies/user/role-catalog.json` (`clinicalRoleCatalog.ts`). |
| **User service** | Optional deploy merge via `ROLE_CATALOG_OVERLAY=/app/policies/role-catalog.json` (copied from the product policy bundle at image build). |
| **Authentication service** | `VALID_TENANT_TYPES` env var (comma-separated org kinds for JWT mint). |

**`default_roles_by_actor`:** UI-only defaults for enroll forms and demos. Not applied on Authentication login provision.

## Build and publish

```bash
# From CDP repo root
docker build -f policies/Dockerfile -t cdp-policies:local policies
```

CI: `.github/workflows/cdp-policies-build-push.yml` on tag `cdp-policies/vX.Y.Z`.

## Consumer wiring

| Service | Image pin | Runtime path |
|---------|-----------|----------------|
| **Capabilities** | `CDP_POLICIES_IMAGE` at build | `COPY /policies/capabilities` → `/app/policies` |
| **User** | `USER_PRODUCT_POLICIES_IMAGE` at build (default `cdp-policies`) | `COPY /policies/user/role-catalog.json` → `/app/policies/role-catalog.json`; `COPY /policies/user/cedar/` → `/app/policies/` |

Non-CDP products can publish their own policy bundle image with the same layout under `/policies/user/` and pass `USER_PRODUCT_POLICIES_IMAGE` when building the user service.

See [OPERATIONS.md](../OPERATIONS.md) for local compose and cloud deploy steps.

- **Base vocabulary:** none in user repo; optional `policies/roles/default.json` for non-CDP products only
- **Architecture:** [ADR-0012](../architecture/adrs/0012-ui-capabilities-control-plane.md), [ADR-0014](../architecture/adrs/0014-tenant-types-and-org-roles.md)
