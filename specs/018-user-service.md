# Feature Specification: User Service (Tier-2 platform roles)

**Feature Branch**: `018-user-service`  
**Created**: 2026-05-28  
**Status**: Draft  
**Input**: [authentication#11](https://github.com/Neosofia/authentication/issues/11) Stage 2 — platform role catalog, user CRUD, Cedar, CDP admin UI.

## Overview

The User Service is the authoritative store for **Tier-2 platform roles** and **scope attributes** (`site_uuid`, `site_group_uuid`, `authorized_study_ids`) for human principals. Authentication continues to attest **Tier-1 actor classes** (`operator`, `clinician`, `patient`) via WorkOS and JWT issuance.

Stage 2 ships the **v1 role subset** from issue #11 and operator-facing CDP UI to **list/edit** users (no registry create API). Stage 3 expands the catalog, BYO policy, login-time provisioning (auth → user service), and additional attributes.

## Scope (Stage 2)

| In scope | Out of scope (Stage 3+) |
|----------|-------------------------|
| New `user` Python service from platform template | Full `clinical.license.*` enforcement |
| Postgres + audit history for `users` | Study / Research Tier-3 service |
| CRUD API with Cedar (self vs operator) | JWT embedding of all platform roles |
| v1 platform role catalog (seeded constant) | Per-patient assignment graphs |
| CDP operator UI: list/edit users, audit trail | `POST /users` (Stage 3: auth provisions user rows on login) |

### v1 platform roles (enabled subset)

| Branch | Roles |
|--------|--------|
| `patient.function` | `self` |
| `clinical.function` | `surgeon`, `staff-nurse`, `care-coordinator`, `readonly` |
| `clinical.risk` | `reviewer`, `quality-analyst` |
| `research.function` | `crc`, `pi` |
| `operator` | `platform-admin`, `audit-reader` |

## API (v1)

Base path: `/api/v1/users`

| Method | Path | AuthZ |
|--------|------|--------|
| GET | `/api/v1/users` | Tier-1 `operator` |
| GET | `/api/v1/users/{uuid}` | Cedar: self or `operator.platform-admin` |
| PATCH | `/api/v1/users/{uuid}` | Cedar: self (limited fields) or `operator.platform-admin` (all fields) |
| GET | `/api/v1/users/{uuid}/audits` | Cedar: self or `operator.platform-admin` |
| GET | `/api/v1/roles` | Authenticated — returns v1 catalog |

### User record

```json
{
  "uuid": "…",
  "tenant_uuid": "…",
  "idp_id": "user_01…",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "actor_class": "clinician",
  "platform_roles": ["clinical.license.rn", "research.function.crc"],
  "site_uuid": "019e02e1-94e1-722b-bd61-f7f95fb1604c",
  "site_group_uuid": null,
  "authorized_study_ids": ["NEO-001"]
}
```

## Cedar (service-owned)

Namespace: `users`

- **Self**: principals may `user:read` and `user:update` their own user record (name fields only on self-update).
- **Operator**: principals with `operator.platform-admin` may read/update any profile and list users (list route also requires Tier-1 `operator` JWT for defense in depth).

## CDP UI

Under **Admin → Users** (operator menu): paginated list, edit roles/name, view audit history (create deferred to Stage 3 login provisioning).

## Tenants

Tenant identity (`uuid`, `name`, WorkOS `idp_id`) is owned by **Authentication** (`tenants` table, provisioned on login). The user service stores only `users.tenant_uuid` as a reference to that UUID.

Human identity (`uuid`, `idp_id`, name, email) is owned by **Authentication** (`users` table, provisioned on login). The user service uses the **same `uuid`** as the primary key for Tier-2 profiles (JWT `sub`); it does not mint its own user ids.

- `GET /api/v1/tenants/{uuid}` on Authentication — operators may read any tenant; other principals only their session tenant.
- The user service does **not** host a `tenants` table.

## Port

HTTP listener **8018** (CDP spec **018** → 8000 + 18).

## Dependencies

- Authentication `v0.30.0+` (`JWT_WEB_AUDIENCE` includes `user`; `operator` Tier-1 from v0.29.0+)
- User service `v0.2.0+`, CDP UI `v0.2.0+` with `VITE_USER_API_URL`
- `authorization-in-the-middle` + `authentication-in-the-middle` (published SDK wheels)

## References

- authentication#11 — role model ADR target
- Spec 014 — Authentication Service
- Spec 017 — Audit Infrastructure (separate feature; do not confuse with this spec)
- ADR-0012 — UI capabilities control plane
