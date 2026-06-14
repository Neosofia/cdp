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

Platform Cedar for the user service still lives in the [user](https://github.com/Neosofia/user) repo (`user/policies/*.cedar`); CDP adds product vocabulary via `user/role-catalog.json` only.

## Role catalog (`user/role-catalog.json`)

| Consumer | How it uses this file |
|----------|------------------------|
| **CDP UI** | Bundled at build time via `@policies/user/role-catalog.json` (`clinicalRoleCatalog.ts`). |
| **User service** | Optional deploy merge via `ROLE_CATALOG_OVERLAY=/app/policies/role-catalog.json` (copied from `cdp-policies` at image build). |
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
| **User** | `CDP_POLICIES_IMAGE` at build | `COPY /policies/user/role-catalog.json` → `/app/policies/role-catalog.json` |

See [OPERATIONS.md](../OPERATIONS.md) for local compose and cloud deploy steps.

- **Base vocabulary:** [user/roles/README.md](https://github.com/Neosofia/user/blob/main/roles/README.md)
- **Architecture:** [ADR-0012](../architecture/adrs/0012-ui-capabilities-control-plane.md), [ADR-0014](../architecture/adrs/0014-tenant-types-and-org-roles.md)
