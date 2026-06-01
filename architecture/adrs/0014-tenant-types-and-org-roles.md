# 14. Tenant types and org roles

Date: 2026-05-31

## Context

The platform uses **Tier-1 roles** on the JWT (`operator`, `clinician`, `patient`) to express who someone is in broad terms. **Tier-2** today is a flat `platform_roles[]` list with long dotted slugs (`cro.function.field-cra`, `sponsor.systems.etmf-specialist`, …). That vocabulary is useful for product pickers and audit labels, but it is the wrong shape for authorization:

- Cedar policies balloon when every job function needs its own `contains()` check.
- A separate JSON "admin policy matrix" plus generated Cedar duplicates the same facts and drifts.
- **Tenant type** already exists implicitly in role prefixes (`cro.`, `sponsor.`, `research.`) but is not a first-class scope on the organization.

Enterprise deployments organize around **org kind** (platform operator, CRO, sponsor, investigator site, SMO). Permissions should be expressed in Cedar against a small, stable set of facts—like Tier-1—not against hundreds of catalog slugs.

## Decision

Introduce two coordinated concepts, parallel to Tier-1 / Tier-2:

| Concept | Where it lives | Purpose |
|---------|----------------|---------|
| **Tenant type** | `tenants.type` (Authentication), JWT `neosofia:tenant_type`, Cedar `tenantType` on principal and tenant resource | Org-kind scope: what kind of organization this tenant is |
| **Org roles** | `users.org_roles[]` (User registry), JWT `neosofia:org_roles`, Cedar `orgRoles` on principal | Job/admin hat **within** that tenant type: `admin`, `clinical-ops`, `readonly`, … |

**Authorization (Cedar, Capabilities UI)** evaluates only:

- Tier-1 JWT roles (`operator`, `clinician`, `patient`)
- Tenant type (principal and resource must align for cross-user admin)
- Org roles (small enum per tenant type)

**Catalog** (`roles/*.json`) lists valid org roles **per tenant type** and optional **job functions** for pickers and labels. Job functions are not repeated in Cedar.

There is **no** intermediate policy matrix JSON and **no** codegen between config and Cedar. Cedar files in `cdp/policies/` and `user/policies/` are edited directly and are the source of truth for permissions.

### Tenant types (v1)

| Type | Typical org | Notes |
|------|-------------|--------|
| `platform` | Neosofia / operator tenant | Full cross-tenant platform ops when combined with `operator` Tier-1 |
| `cro` | Contract research org | Study delivery, monitoring, systems |
| `sponsor` | Pharma / biotech sponsor | Oversight, vendor governance |
| `site` | Hospital / clinic site | Investigator site staff |
| `smo` | Site management org | Site activation, enrollment support |
| `patient` | Patient-facing org (if distinct) | Self-service and patient advocates (caregivers, navigators); pairs with Tier-1 `patient` |

Deploy-time overlay may omit types the product does not use.

### Org roles (v1, per tenant type)

Small slugs—no `-lead` / `-manager`; seniority is **role overrides** (future).

| Tenant type | Org roles (authorization) |
|-------------|---------------------------|
| `platform` | `admin`, `audit` |
| `cro` | `admin`, `clinical-ops`, `systems`, `monitor`, `readonly` |
| `sponsor` | `admin`, `clinical-ops`, `systems`, `oversight`, `readonly` |
| `site` | `admin`, `research`, `clinical`, `readonly` |
| `smo` | `admin`, `activation`, `readonly` |
| `patient` | `self`, `advocate` |

### Cedar rules (pattern)

All cross-user admin requires **same tenant** (`principal.tenantId == resource.tenantId`) unless platform `admin` explicitly allows platform-tenant operations.

Examples (User service):

- `tenant.user.list` → `user:list` when `principal.orgRoles.contains("admin")` (or `audit` for read-only list) and tenant match.
- `tenant.user.update_roles` → `user:update` when `principal.orgRoles.contains("admin")` and tenant match; assignable org roles validated against catalog for `principal.tenantType`.

Capabilities UI mirrors the same `tenantType` + `orgRoles` checks on `ui::Feature` entities.

### Job functions (optional, non-authorization)

Fine-grained titles (`clinical.function.staff-nurse`, `research.function.crc`) may remain in catalog under `job_functions` for UX, reporting, and future study scope. They do **not** appear in Cedar until a concrete product requirement needs job-level authz—and then prefer **overrides** on org roles, not new Cedar dimensions.

## Rationale

- **Same pattern as Tier-1**: a few stable enums in the token; Cedar stays readable.
- **Tenant type does scope heavy lifting**: a CRO admin assigns CRO org roles, not sponsor roles; prefix rules become `tenant_type` + catalog section, not string prefix logic alone.
- **No abstraction layer**: one Cedar file per service/bundle; catalog validates assignment only.
- **DRY**: org role vocabulary is defined once in `roles/*-catalog.json`; Cedar references the same slug strings.

## Consequences

- Authentication gains `tenants.type` and emits `neosofia:tenant_type` on human tokens from its own DB.
- Authentication mirrors `users.org_roles[]` for JWT claims only (updated on best-effort User provision; token mint does not call User).
- User registry is the source of truth for `org_roles[]`.
- Remove `user-admin-policy.json` and `*.cedar.review` drafts; replace with direct Cedar using `tenantType` / `orgRoles`.
- Capabilities principal builder must pass `tenant_type` and `org_roles` from JWT (same as other `neosofia:*` attrs).
- Stage 4 JWT embedding carries `tenant_type` + `org_roles`, not full job-function lists.

## Status

Accepted. User **v0.5.0** and Authentication **v0.32.0** implement DB, JWT, and Cedar; CDP catalog and UI policies use the same model.

## References

- [ADR-0010: Single active role UI](0010-single-active-role-ui.md)
- [ADR-0012: UI Capabilities control plane](0012-ui-capabilities-control-plane.md)
- [Spec 018-user-service](https://github.com/Neosofia/cdp/blob/main/specs/018-user-service.md)
- Role model: [authentication#11](https://github.com/Neosofia/authentication/issues/11)
