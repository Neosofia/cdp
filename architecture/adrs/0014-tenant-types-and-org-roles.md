# 14. Tenant types and roles

Date: 2026-05-31

## Context

Tier-1 **actors** (`operator`, `clinician`, `patient`) express broad principal class on the human JWT. Tier-2 authorization cannot use hundreds of dotted job-function slugs in Cedar -- policies become unmaintainable, and a parallel JSON policy matrix drifts from real permissions.

Enterprise customers organise by **org kind** (platform, CRO, sponsor, site, SMO). Permissions need a small, stable Tier-2 model scoped to that kind, the same way Tier-1 stays a short enum.

## Decision

1. **Tier-2 is tenant type plus roles.** Tenant type is org kind on the Authentication tenant row. Roles are admin or functional hats within that type, stored in the User registry as `{tenant_type}.{role}` slugs (for example `cro.clinical-ops`) and carried on the JWT as short names (`clinical-ops`) together with `neosofia:tenant_type`.

2. **User registry is the source of truth for `roles[]`.** Authentication mirrors `roles[]` into `users.roles` for JWT embedding only. Token mint reads the Authentication database and does not call User on the critical path. The mirror updates on best-effort provision after login.

3. **Cedar is the source of truth for authorization.** Service and CDP UI policy files define who may do what. The role catalog (`roles/*.json`, optional product overlay) validates assignments and powers pickers; it does not generate Cedar and does not hold a parallel permission matrix.

4. **Job functions stay in the catalog for UX only.** Fine-grained titles (for example `clinical.function.staff-nurse`) are not Cedar dimensions. Future job-level scope uses overrides on roles, not new policy axes.

5. **v1 tenant types and role enums** live in the User service catalog and deploy-time overlay. Human-readable tables: [user/roles/README.md](https://github.com/Neosofia/user/blob/main/roles/README.md). Machine source: `user/roles/default.json`; CDP overlay: [roles/user-catalog.overlay.json](https://github.com/Neosofia/cdp/blob/main/roles/user-catalog.overlay.json). `tenants.type` has no default.

Registry obligations and operator-facing behavior are in [spec 018](https://github.com/Neosofia/cdp/blob/main/specs/018-user-service.md). Field names and service policy depth are in [openapi.json](https://github.com/Neosofia/user/blob/main/openapi.json) and [SECURITY.md](https://github.com/Neosofia/user/blob/main/SECURITY.md).

## Rationale

- **Same pattern as Tier-1:** a few stable facts in the token; Cedar stays readable and auditable.
- **Tenant type scopes assignment:** a CRO administrator grants CRO roles, not sponsor roles; catalog `assigner_prefixes` tie Tier-1 actors to grantable tenant-type prefixes.
- **Fault-tolerant login:** sessions and tokens still issue when User is temporarily unavailable; the registry catches up on provision without blocking mint.
- **DRY:** one vocabulary in catalog JSON; one permission story in Cedar per service or UI bundle.

## Consequences

- Authentication owns `tenants.type` and the `users.roles` mirror; User owns registry `roles[]`.
- Human JWTs use `neosofia:actors`, `neosofia:tenant_type` (when set), and `neosofia:roles` (short names). Capabilities and User API evaluation both consume those facts; UI menu gating remains a separate concern ([ADR-0012](0012-ui-capabilities-control-plane.md)).
- Adding a tenant type or role requires catalog overlay (and usually Cedar) changes; products do not fork the User service for vocabulary alone.
- Superseding this model requires a new ADR; do not revive flat `platform_roles` or job-function Cedar checks without an explicit decision.

## Status

Accepted

## References

- [ADR-0010: Single active role UI](0010-single-active-role-ui.md)
- [ADR-0012: UI Capabilities control plane](0012-ui-capabilities-control-plane.md)
- [Spec 018-user-service](https://github.com/Neosofia/cdp/blob/main/specs/018-user-service.md)
