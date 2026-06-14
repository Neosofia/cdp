# Product Installation Plan

Per-version deploy steps for operators. User-visible changes: [CHANGELOG.md](CHANGELOG.md).

## Greenfield Step 0 — assign platform registry roles

Run once per new environment **before** platform admin UI or `GET /api/v1/users` will work. Login provision creates identity only; **`roles` stays `[]`** until tier-2 slugs are assigned. Tier-1 WorkOS **`operator`** does **not** imply **`platform.admin`**. CDP `default_roles_by_actor` is UI-only and is **not** applied on login ([policies/README.md](policies/README.md)).

**Prerequisites**

- WorkOS org exists; the platform admin has tier-1 **`operator`** assigned.
- Authentication and user services deployed; migrations applied; `USER_PROVISIONING_ENABLED=true` and `AUTHENTICATION_CLIENT_SECRET` set.
- Admin completes **one successful login** (creates the user registry row). Record their **`user_uuid`** (`JWT sub`).

**Steps**

1. Assign tier-2 roles on the user registry row (first platform admin example):

   ```sql
   UPDATE users
   SET roles = ARRAY['platform.admin']::text[]
   WHERE uuid = '<admin-user-uuid>';
   ```

   Use the user service **migration/superuser** database URL. After the first admin exists, further role changes use **Admin → Users** or authorized `PATCH /api/v1/users/{uuid}`.

2. Admin **logs out and back in** so authentication reprovisions and refreshes its JWT roles mirror from the user-service row. Token refresh alone does not update the mirror.

3. **Verify:** `GET /api/v1/users/{uuid}` shows `platform.admin`; decoded JWT has `neosofia:roles` containing **`admin`**; **Admin → Users** returns **200**.

**Evidence:** ticket with admin `user_uuid` (no PHI); JWT claim capture.

**Demo data:** [`scripts/seed_demo_platform.py`](scripts/seed_demo_platform.py) seeds catalog patients separately; it does not replace Step 0 for your real admin account. See also [user INSTALLATION_PLAN](https://github.com/Neosofia/user/blob/main/INSTALLATION_PLAN.md) and [authentication INSTALLATION_PLAN](https://github.com/Neosofia/authentication/blob/main/INSTALLATION_PLAN.md).

---

## CDP UI 2026.06.14 (authorization middleware v0.7.1)

**Build:** CDP UI **2026.06.14**; **authentication v0.37.0**; **user v0.8.0**; **chat v0.6.0**; **care-episode v0.7.0**; **capabilities v0.7.0**; **cdp-policies v0.1.0**.

**Prerequisites:**

- Publish **cdp-policies/v0.1.0** before rebuilding **capabilities** and **user** (both pin `CDP_POLICIES_IMAGE`).
- Deploy all five backend services; migrations to head on authentication, user, chat, and care-episode databases.

**Deploy:**

1. Pull `ghcr.io/neosofia/authentication:v0.37.0`, `ghcr.io/neosofia/user:v0.8.0`, `ghcr.io/neosofia/chat:v0.6.0`, `ghcr.io/neosofia/care-episode:v0.7.0`, and `ghcr.io/neosofia/capabilities:v0.7.0`.
2. Deploy CDP UI **2026.06.14** after backend images are live.

**Post-deploy verification:**

1. `GET /health` on each service reports the pinned semver (**0.37.0**, **0.8.0**, **0.6.0**, **0.7.0**, **0.7.0**).
2. Platform operator can list registered users and care episodes without **403** when the active session role is entitled.
3. Patient **Care assistant** and clinician patient chat flows work end-to-end.

**Evidence:**

- Platform health dashboard all services healthy.
- `GET /health` JSON version fields for authentication, user, chat, care-episode, and capabilities.

---

## CDP UI 2026.06.11 (chat v0.4.0 client)

**Build:** CDP UI **2026.06.11**; compose pin **chat v0.4.0**

**Deploy:**

1. Deploy chat **v0.4.0** per [chat INSTALLATION_PLAN](https://github.com/Neosofia/chat/blob/main/INSTALLATION_PLAN.md).
2. Deploy CDP UI **2026.06.11** in the same change window.

**Verify:**

- Patient **Care assistant** and clinician patient chat work end-to-end.

---

## CDP UI 2026.06.10 (authorization middleware v0.4.23)

**Build identifiers:** CDP UI **2026.06.10**; **authentication v0.33.0**; **user v0.7.0**; **chat v0.3.0**; **care-episode v0.3.0**; **capabilities v0.6.0**; **cdp-user-policies v0.2.1** unchanged.

**Prerequisites:**

- Deploy all five backend services; run migrations to head on authentication, user, chat, and care-episode databases.
- UI build includes `VITE_*_API_URL` values for authentication, capabilities, user, chat, care-episode, and template.

**Deploy:**

1. Pull `ghcr.io/neosofia/authentication:v0.33.0`, `ghcr.io/neosofia/user:v0.7.0`, `ghcr.io/neosofia/chat:v0.3.0`, `ghcr.io/neosofia/care-episode:v0.3.0`, and `ghcr.io/neosofia/capabilities:v0.6.0`.
2. Deploy CDP UI **2026.06.10** after backend images are live.

**Post-deploy verification:**

1. `GET /health` on each service reports the pinned semver (**0.33.0**, **0.7.0**, **0.3.0**, **0.3.0**, **0.6.0**).
2. Platform operator can list registered users and care episodes without **403** when the active session role is entitled.
3. Patient **Care assistant** and clinician patient chat flows still work end-to-end.

**Evidence:**

- Screenshot of platform health dashboard showing all services healthy.
- `GET /health` JSON version fields for authentication, user, chat, care-episode, and capabilities.

## CDP UI 2026.06.05 (chat v0.2.2 / care-episode v0.2.3)

**Build identifiers:** CDP UI **2026.06.05**; **chat v0.2.2**; **care-episode v0.2.3**.

**Prerequisites:**

- Deploy **chat v0.2.2** and **care-episode v0.2.3**; run migrations to head on both databases.
- UI build includes `VITE_CHAT_API_URL` and `VITE_CARE_EPISODE_API_URL` pointing at the deployed services.

**Deploy:**

1. Pull `ghcr.io/neosofia/chat:v0.2.2` and `ghcr.io/neosofia/care-episode:v0.2.3`.
2. Deploy CDP UI **2026.06.05** after backend images are live.

**Post-deploy verification:**

1. Re-run `scripts/seed_demo_platform.py` against staging (requires operator JWT and migration DB URLs for chat and care-episode).
2. Patient: open **Care assistant**, send a message, start a **New chat** when sidebar shows multiple threads.
3. Clinician: open a patient, send a reply; patient thread shows **Care team** badge and no AI reply in that thread.

**Evidence:**

- Screenshot of patient conversations sidebar with **Care team** badge.
- `GET /health` on chat reports **0.2.2** and care-episode **0.2.3**.

## CDP UI 2026.06.05 (user v0.6.9 authz patch)

**Build identifiers:** **user v0.6.9**; **cdp-user-policies v0.2.1** unchanged.

**Deploy:**

1. Deploy **user v0.6.9** (same policy bundle and `ROLE_CATALOG_OVERLAY` as v0.6.8).

**Post-deploy verification:**

1. Multi-role operator: **Registered users** stat and **Admin → Users** work under **Platform Admin** session role.

## CDP UI 2026.06.05 (provisioning patch)

**Build identifiers:** **user v0.6.8**; **cdp-user-policies v0.2.1**; CDP UI **2026.06.05** unchanged unless repinned.

**Prerequisites:**

- Publish **cdp-user-policies v0.2.1** and rebuild **user v0.6.8** with that pin.
- Authentication **service registry** `user` row: **HTTPS** `base_url` (not `http://user.railway.internal:…`).

**Pre-deploy:**

- Set `ROLE_CATALOG_OVERLAY=/app/policies/role-catalog.json` on the user service (cloud).
- Optional: set `USER_SERVICE_BASE_URL` on authentication to the same HTTPS user URL for future migration `005` runs.

**Deploy:**

1. Tag and publish **cdp-user-policies/v0.2.1**; wait for GHCR image.
2. Deploy **user v0.6.8** (Dockerfile pins v0.2.1).
3. Update Authentication `services.base_url` for `user` to HTTPS if still on internal HTTP.

**Post-deploy verification:**

1. Fresh login provisions a registry row with **`roles: []`**; complete [Greenfield Step 0](#greenfield-step-0--assign-platform-registry-roles) before expecting tier-2 roles in the session picker.
2. Auth logs: `user_provisioning_succeeded`, not `user_provisioning_failed` with `status_code=302`.

**Evidence:**

- Step 0 complete for the platform admin; session role picker lists assigned tier-2 roles (for example Site Clinical and Patient on demo multi-role users).

## CDP UI 2026.06.05

**Build identifiers:** CDP UI **2026.06.05** (CalVer); **authentication v0.32.2**; **user v0.6.7**; **care-episode v0.2.2**; **cdp-user-policies v0.2.0**.

**Prerequisites:**

- Deploy **authentication v0.32.2**, **user v0.6.7**, and **care-episode v0.2.2**.
- Publish **cdp-user-policies v0.2.0** and rebuild the user service image with `CDP_USER_POLICIES_IMAGE=ghcr.io/neosofia/cdp-user-policies:v0.2.0` (or pin that tag in the user Dockerfile before build).
- Run care-episode migration **004** (`last_activity` on sessions).
- WorkOS tier-1 actors for demo users: **operator**, **clinician**, **patient** (and **study** when testing sponsor roles).

**Pre-deploy:**

- Set `VITE_*_API_URL` values for the UI build, including `VITE_CARE_EPISODE_API_URL`.
- Pull `ghcr.io/neosofia/authentication:v0.32.2`, `ghcr.io/neosofia/user:v0.6.7`, and `ghcr.io/neosofia/care-episode:v0.2.2` before updating compose stacks.

**Deploy:**

1. Run authentication, user, and care-episode migrations to head.
2. Tag and publish **cdp-user-policies/v0.2.0** from CDP; rebuild **user** if the image was built before that tag existed.
3. Deploy CDP UI build **2026.06.05** with updated `VITE_*` configuration.

**Post-deploy verification:**

1. Log in with a multi-actor demo user; session picker lists tier-2 roles with human-readable labels (requires Step 0 or demo seed for tier-2 assignments).
2. Switch to **patient** — patient dashboard shows upcoming appointments, messages, and recent records (not records-only).
3. After WorkOS adds tier-1 **`operator`**, assign tier-2 roles (Step 0 or **Admin → Users**); **`platform.admin` is not inferred from WorkOS actor class**.
4. Operator **clone-demo** path still works for seeding a new patient UUID.

**Evidence:**

- Screenshot of full patient dashboard (stat row plus appointments and messages sections).
- `GET /health` from care-episode reports **0.2.2**.

## CDP UI 2026.06.04

**Build identifiers:** CDP UI **2026.06.04** (CalVer); **authentication v0.32.2**; **user v0.6.5**.

**Prerequisites:**

- Deploy **authentication v0.32.2** and **user v0.6.5** (User migration `002` adds `tos_accepted_at`).
- WorkOS **`operator`** role for platform admin testers.

**Pre-deploy:**

- Set `VITE_AUTH_API_URL`, `VITE_USER_API_URL`, and other `VITE_*_API_URL` values for the UI build.
- Rebuild or pull `ghcr.io/neosofia/authentication:v0.32.2` and `ghcr.io/neosofia/user:v0.6.5` before updating `docker-compose.dev.yml` stacks.

**Deploy:**

1. Run authentication and user migrations to head.
2. Deploy CDP UI build **2026.06.04** with updated `VITE_*` configuration.

**Post-deploy verification:**

1. Log in as **`operator`** — home title reads **Platform Admin Dashboard**; breadcrumb **Dashboard**.
2. **Failed sign-ins (24h)** stat and **Recent audit events** include identity-provider failures when present.
3. New human users see the terms-of-service gate until acceptance is saved on the profile.
4. **Admin → Users** and **Admin → Services** remain available for registry operations.

**Evidence:**

- Screenshots of operator dashboard stat row and audit feed with a test failed sign-in (no PHI in tickets).
- Record of successful ToS acceptance for one test user.

## CDP UI v0.2.0

**Build identifiers:** CDP UI build **v0.2.0**; **authentication v0.30.0**; **user v0.2.0**.

**Prerequisites:**

- Authentication and User services deployed per their installation plans for the same tags.
- WorkOS **`operator`** role assigned for registry/admin testers.

**Pre-deploy:**

- Set `VITE_USER_API_URL` to the public User API URL in the UI build environment (alongside other `VITE_*_API_URL` values).

**Deploy:**

1. Build and deploy CDP UI v0.2.0 with updated `VITE_*` configuration.

**Post-deploy verification:**

1. Log in as WorkOS **`operator`** (role picker → **operator** if you have multiple roles).
2. **Admin → Users** — list loads (empty is OK).
3. Edit an existing user's platform roles; save succeeds.

**Evidence:**

- Build config record showing `VITE_USER_API_URL` (no secrets).
- Screenshots or test script output for Admin → Users list and successful role save.
