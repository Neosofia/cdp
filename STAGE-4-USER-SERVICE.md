# Stage 4 — User service: tenant types and org roles (ADR-0014)

**Purpose:** Handoff for Tier-2 delivery using **tenant type** + **org roles** (not flat `platform_roles` / job-function Cedar).

**Prerequisite:** [STAGE-3-USER-SERVICE.md](STAGE-3-USER-SERVICE.md) shipped — login `PUT` provisioning, profile reads from User, expanded catalog, Cedar hardening.

**Parent spec:** [specs/018-user-service.md](specs/018-user-service.md)  
**Canonical design:** [architecture/adrs/0014-tenant-types-and-org-roles.md](architecture/adrs/0014-tenant-types-and-org-roles.md)  
**Repos:** `authentication`, `user`, `capabilities`, `cdp` (UI + policies); middleware in `sdk`

---

## Role catalog overlay

Deploy-time file: [`roles/user-catalog.overlay.json`](roles/user-catalog.overlay.json), merged by the User service via `ROLE_CATALOG_OVERLAY`. Base catalog: `user/roles/default.json` in the User repo.

### Two layers (no policy matrix JSON)

| Layer | JSON key | Used by | Example |
|-------|----------|---------|---------|
| **Tenant type + org role** | `tenant_types`, `roles` | Cedar, JWT `org_roles`, registry assignment | `cro.admin`, `sponsor.clinical-ops` |
| **Job function** | `job_functions` | Labels, pickers, study scope later — **not** Cedar | `clinical.function.staff-nurse` |

Authorization slug format: `{tenant_type}.{org_role}` (e.g. `site.research`).

`assigner_prefixes` maps Tier-1 JWT roles to tenant-type prefixes an assigner may grant (`operator` → `platform.`, `cro.`, …).

### Cedar is source of truth

Edit Cedar directly — no parallel JSON capability matrix or codegen.

| Bundle | Path |
|--------|------|
| User API | `user/policies/policy.cedar` |
| CDP UI entitlements | `cdp/policies/tenant_user.cedar` |

Cedar uses `tenantType`, `orgRoles`, `tenantId` on principals (short org-role names in JWT, e.g. `admin`).

### JWT and registry (fault-tolerant mint)

| Fact | Where |
|------|--------|
| **Org roles (source of truth)** | User Postgres `org_roles[]` |
| **Org roles (JWT cache)** | Authentication `users.org_roles` mirror — updated on **best-effort** provision `PUT` only |
| **Tenant type** | Authentication `tenants.type` — **no default**; set explicitly per org |
| **Token mint** | Auth DB only — **must not** call User service on `POST /api/token` |

Claims: `neosofia:tenant_type` (when `tenants.type` is set), `neosofia:org_roles` (from mirror). Middleware maps to Cedar `tenantType` / `orgRoles`.

### Delivery status

| Piece | Status |
|-------|--------|
| ADR-0014 + catalog shape | Done |
| User `org_roles`, Cedar, catalog validation | Done (user v0.5.0) |
| Auth `tenants.type`, org_roles mirror, JWT claims | Done (authentication v0.32.0) |
| CDP UI `org_roles` field | Done |
| Capabilities UI entitlements Cedar | Done (`tenant_user.cedar`) |
| Menu gating on `ui:tenant:user:*` vs coarse `ui:menu:operator` | Open |
| Study-scoped overrides / role sets | Future |

---

## Stage 3 baseline (superseded fields)

| Area | After Stage 3 | After Stage 4 (ADR-0014) |
|------|---------------|---------------------------|
| **Tier-2 source of truth** | `platform_roles[]` | `org_roles[]` (`{tenant_type}.{org_role}`) |
| **Human JWT** | Tier-1 only | Tier-1 + optional `tenant_type`, `org_roles` (Auth mirror) |
| **User Cedar** | `isPlatformAdmin` / legacy slugs | `tenantType` + `orgRoles` |
| **Login provisioning** | Fire-and-forget `PUT` on OAuth callback | Same; mirror updated on success |

---

## Provisioning on JWT refresh *(Stage 4 candidate)*

Stage 3 fires `PUT /internal/v1/users/{uuid}` only from the OAuth **callback** after IdP login. If User is down at callback, the user still gets a session but has no registry row until the next WorkOS login.

**Stage 4 option:** also fire the same idempotent `PUT` from `POST /api/token` session grant (fire-and-forget, same contract). Retries without a full IdP round-trip; adds User traffic every JWT refresh (~15 min). Gate with flag or only when auth DB row exists and User row is missing.

**Tradeoffs:**

| | Callback only (Stage 3) | + Token refresh (Stage 4) |
|--|-------------------------|---------------------------|
| User down at login | Heals on next WorkOS login | Heals on next JWT issue |
| User load | One `PUT` per login | + one `PUT` per refresh if enabled |
| Coupling | Minimal at token mint | Slightly more Auth → User traffic |

---

## Stage 4 goal (remaining)

**Shipped:** ADR-0014 model — org roles in User registry, tenant type on Auth tenants, JWT snapshot from Auth DB only (no User on token mint).

**Still open:**

1. **Provisioning on JWT refresh** — optional `PUT` from `POST /api/token` (callback-only today); must stay async / off critical path.
2. **Capabilities menus** — gate Admin → Users on `ui:tenant:user:*` entitlements.
3. **HTTP caching / staleness** — document max drift between PATCH and JWT mirror; optional refresh nudge after role change.
4. **SDK service client** — shared wheel for Auth → User provision (see below).

**Not in scope:**

- Tier-3 lifecycle state in the user registry
- Replacing User as source of truth for role assignment (PATCH remains authoritative)
- Per-job-function Cedar checks (use org roles + overrides later)

---

## Problem (addressed by ADR-0014)

Flat `platform_roles` and hundreds of job-function slugs do not scale in Cedar. Stage 4 replaces them with **tenant type** + small **org role** enums, with job functions kept in catalog for UX only.

Downstream services read Tier-2 from JWT (`org_roles` + `tenant_type`) without calling User on each request. User service still loads the registry row for its own Cedar when handling API calls.

---

## SDK follow-up for service-to-service clients

Stage 4 should also capture a cross-cutting SDK task: add a reusable client wheel for
service-to-service HTTP calls so each caller can focus on business logic instead of
repeating transport plumbing.

Target use cases include Authentication -> User provisioning today and future
cross-service reads for Tier-2 delivery.

The shared client should standardize at least:

- service-token auth and common outbound headers
- timeout defaults and consistent network / HTTP error handling
- structured logging around outbound requests and failures
- response parsing / validation and common exception types
- any repeated request metadata or trace propagation the platform expects

The goal is to stop hand-rolling `httpx` calls in each service for base URL lookup,
auth headers, logging, error shaping, and similar repeated work.

---

## Option A — HTTP / service cache

Keep User DB authoritative. Cache reads elsewhere.

| Layer | Ideas |
|-------|--------|
| **Response headers** | `Cache-Control: no-store` on profile/user/token (explicit for intermediaries); or short `private, max-age=N` only if a safe consumer exists |
| **Service-side cache** | In-process or Redis: key `user:{uuid}:platform_roles`, TTL + invalidate on User PATCH (webhook, pub/sub, or caller invalidates) |
| **Downstream** | Each service caches row fragment after first load; bounded TTL |

**Pros:** DB stays sole source of truth; admin PATCH effective after TTL or invalidation — controllable.  
**Cons:** Invalidation plumbing; every Cedar evaluator still needs cache hit logic; distributed consistency.

**Triggers:** User p95 read cost, User outage should not block authz on cached principals (with bounded staleness).

---

## Option B — JWT embedding *(chosen: ADR-0014 variant)*

Authentication embeds **short org roles** and **tenant type** from its **own DB** at mint (not a User GET on the critical path):

```json
{
  "neosofia:roles": ["operator"],
  "neosofia:tenant_type": "platform",
  "neosofia:org_roles": ["admin"]
}
```

Mirror `users.org_roles` is refreshed when best-effort User provision succeeds after login. Staleness after admin PATCH is bounded by token TTL until re-login/refresh.

**Rejected for mint path:** synchronous User service read on `POST /api/token` (availability coupling).

---

## Option C — Hybrid

Common pattern:

- JWT carries **subset** (e.g. active platform role for UI) or full list with **short TTL**.
- User remains authoritative; cache/JWT are snapshots with documented max staleness.
- Admin demotion: PATCH User + optional session revoke / refresh nudge.

Decide in Stage 4 planning once a concrete consumer exists.

---

## Current HTTP cache inventory

| Endpoint | Cache-Control today |
|----------|---------------------|
| `GET /.well-known/jwks.json` | `public, max-age=3600` |
| `GET /api/v1/profiles/{id}` | *(none)* |
| User `/api/v1/users*` | *(none)* |
| `POST /api/token` | *(none)* |
| Capabilities `/api/v1/capabilities/*` | *(none)* |

CDP UI `fetch()` uses default browser cache (no `cache:` override) — follows server headers.

---

## Likely consumers (pick driver before build)

| Consumer | Tier needed | Today |
|----------|-------------|--------|
| **User service** | Tier-2 from own DB | Already |
| **Capabilities / CDP UI** | Tier-1 menus; Tier-2 for fine menus later | Tier-1 only |
| **Future clinical APIs** | Tier-2 Cedar on actions | Not built |
| **Authentication profile** | Name/email from User (Stage 3); not roles | N/A |

Stage 4 should name **one driver** (e.g. “Capabilities menus on `operator.platform-admin`”) before choosing A vs B.

**Stage 4 note:** Authorization uses **tenant type** + **org roles** (see [ADR-0014](architecture/adrs/0014-tenant-types-and-org-roles.md)), not per-job-function Cedar checks. Job functions remain catalog vocabulary for UX; study scope uses overrides later.

---

## Decisions before coding

1. **Driver:** which service first needs Tier-2 without User lookup?
2. **Staleness budget:** max seconds/minutes wrong roles after PATCH?
3. **Cache vs JWT vs hybrid** — see options above.
4. **Invalidation:** PATCH webhook, TTL-only, or force token refresh?
5. **`no-store` headers:** add on sensitive routes in Stage 4 regardless of cache strategy?
6. **Claim names:** `neosofia:tenant_type` + `neosofia:org_roles` (short names); omit `tenant_type` when unset on tenant row.
7. **Provision on JWT refresh:** always, missing-row only, or stay callback-only?
8. **SDK client wheel:** what belongs in the shared service-to-service client vs per-service business logic?
9. **Role-set selection model:** if menus and authz use role sets, how does a user pick or inherit the effective set across multiple hierarchy points?

---

## Acceptance criteria *(placeholder)*

- [ ] Documented staleness model (TTL and/or refresh-on-PATCH)
- [ ] At least one downstream consumer uses Tier-2 without per-request User DB read *(or explicit decision to cache inside User only)*
- [ ] Admin PATCH → roles effective within agreed window
- [ ] Sensitive APIs send explicit `Cache-Control` (min. `no-store` on profile/user/token)
- [ ] Spec 018 + SECURITY.md updated

---

## References

- [STAGE-3-USER-SERVICE.md](STAGE-3-USER-SERVICE.md)
- [specs/018-user-service.md](specs/018-user-service.md)
- `user/src/authorization/entities.py` — `resolve_principal()`, Tier-1 vs Tier-2 split
- `authentication/src/routes/auth.py` — JWKS cache header
- `sdk/python/authentication-middleware/src/authentication_in_the_middle/jwks.py` — JWKS client cache
- `sdk/python/authorization-middleware/src/authorization_in_the_middle/flask_identity.py` — `neosofia:*` → Cedar attrs

---

*Stage handoff — authorization design is [ADR-0014](architecture/adrs/0014-tenant-types-and-org-roles.md).*
