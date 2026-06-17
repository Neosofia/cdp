# Product Installation Plan

Per-version deploy steps for operators. User-visible changes: [CHANGELOG.md](CHANGELOG.md).

Release images are published to `ghcr.io/neosofia/*` by CI when service tags are pushed (for example `user/v0.8.2`, `cdp-policies/v0.2.0`, CDP UI CalVer deploy). Operators redeploy pinned versions and verify — they do not build or publish images.

## Database migrations

Each backend service uses Alembic. How to run migrations locally and the expected revision for a tagged release are in that service's **OPERATIONS.md** and **INSTALLATION_PLAN.md**:

| Service | Operations | Installation plan |
|---------|------------|-------------------|
| authentication | [OPERATIONS.md](https://github.com/Neosofia/authentication/blob/main/OPERATIONS.md) | [INSTALLATION_PLAN.md](https://github.com/Neosofia/authentication/blob/main/INSTALLATION_PLAN.md) |
| user | [OPERATIONS.md](https://github.com/Neosofia/user/blob/main/OPERATIONS.md) | [INSTALLATION_PLAN.md](https://github.com/Neosofia/user/blob/main/INSTALLATION_PLAN.md) |
| chat | [OPERATIONS.md](https://github.com/Neosofia/chat/blob/main/OPERATIONS.md) | [INSTALLATION_PLAN.md](https://github.com/Neosofia/chat/blob/main/INSTALLATION_PLAN.md) |
| care-episode | [OPERATIONS.md](https://github.com/Neosofia/care-episode/blob/main/OPERATIONS.md) | [INSTALLATION_PLAN.md](https://github.com/Neosofia/care-episode/blob/main/INSTALLATION_PLAN.md) |

**Railway (staging/production):** migrations run automatically on redeploy via `preDeployCommand = ["python -m alembic upgrade head"]` in each service's `railway.toml`. Check the deploy log for a successful migrate step; run manually only if preDeploy failed.

**Local compose:** `docker-compose.dev.yml` runs a `*-migrate` sidecar before each app service (`depends_on: service_completed_successfully`).

**Manual one-off:** from the service repo with `MIGRATION_DATABASE_URL` set:

```bash
uv run alembic upgrade head
```

**Verify head revision** (use the service **migration/superuser** database URL):

```sql
SELECT version_num FROM alembic_version;
```

Compare `version_num` to the expected revision in that release's service **INSTALLATION_PLAN.md** (for example user **`002`**, care-episode **`011`** at CDP UI **2026.06.18**).

## CDP UI 2026.06.18 / care-episode v0.8.0

**Release pins:** CDP UI **2026.06.18**; **care-episode v0.8.0** (other backend pins unchanged from **2026.06.17** unless your environment already tracks newer tags).

**Prerequisites**

- Staging `VITE_*_API_URL` values point at the redeployed public service URLs.
- Demo catalog seeded (`scripts/seed_demo_platform.py`) if verifying clinician episode lifecycle.

**Deploy**

1. Tag and push **care-episode v0.8.0**; wait for GHCR image publish.
2. Redeploy **care-episode** on Railway (migrations **009**–**011** run via preDeploy).
3. Redeploy **CDP UI** with build/version **2026.06.18**.

**Verify**

1. `GET /health` on care-episode reports **0.8.0**; `alembic_version` is **`011`**.
2. Clinician can close and reopen **DEMO-123** from the patient detail view (or run `pnpm test:e2e` from `cdp/ui` against staging with `E2E_BASE_URL` / `E2E_AUTH_BASE_URL` set).
3. Cross-tenant care-episode list or patch for a clinician returns **403**.

**Evidence**

- Care-episode health **0.8.0**; UI footer shows **2026.06.18**; E2E or manual close/reopen succeeds on staging.

---

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

## CDP UI 2026.06.18 / authentication v0.38.0

**Release pins:** CDP UI **2026.06.18**; **authentication v0.38.1** (other backend pins unchanged from **2026.06.17**).

**Deploy:**

1. Set **`ACCESS_TOKEN_TTL_SECS=1800`** on authentication and redeploy **authentication v0.38.1**.
2. Redeploy CDP UI **2026.06.18**.

**Post-deploy verification:**

1. `GET /health` on authentication reports **0.38.1**; CDP footer **2026.06.18**.
2. `POST /api/token` (`grant_type=session`) returns `"expires_in": 1800`.
3. Patient **Care assistant** and clinician chat history load after 20+ minutes idle (refocus tab or wait for interval refresh).

**Evidence:** Authentication health and token `expires_in`; chat interaction **200** after extended session.

---

## cdp-policies v0.3.0 / capabilities v0.7.3 / CDP UI 2026.06.17

**Release pins:** **cdp-policies v0.3.0**; **capabilities v0.7.3**; CDP UI **2026.06.17** (other backend pins unchanged from **2026.06.16**).

**Deploy:**

1. Publish **`cdp-policies/v0.3.0`** (CI builds `ghcr.io/neosofia/cdp-policies:v0.3.0`).
2. Redeploy **capabilities v0.7.3** (Dockerfile pins `POLICIES_IMAGE=ghcr.io/neosofia/cdp-policies:v0.3.0`).
3. Redeploy CDP UI **2026.06.17** after capabilities is healthy.

**Post-deploy verification:**

1. `GET /health` on capabilities reports **0.7.3**.
2. CDP footer reports **UI 2026.06.17**.
3. Signed-in operator: **Admin** and **Debug** menus visible; `GET /api/v1/capabilities/ui` returns keys like `ui::Menu::"operator"` (not legacy `ui:menu:operator`).
4. Signed-in clinician: **Patients** menu and roster load; entitlement keys use Cedar entity ids.

**Evidence:** Capabilities health JSON; sample capabilities/ui response; operator and clinician menu screenshots.

---

## CDP UI 2026.06.16 / care-episode v0.7.1 / user v0.8.2

**Release pins:** CDP UI **2026.06.16**; **authentication v0.37.0**; **user v0.8.2**; **chat v0.6.2**; **care-episode v0.7.1**; **capabilities v0.7.1**; **cdp-policies v0.2.0**.

**Prerequisites:**

- Chat and care-episode inference env configured (demo seed replays the final patient turn through care-episode after chat SQL seed).

**Deploy:**

1. Redeploy **care-episode v0.7.1** and **user v0.8.2** ([Database migrations](#database-migrations) — automated on Railway redeploy; no new revisions in this release).
2. Redeploy CDP UI **2026.06.16** after backend services are healthy.

**Post-deploy verification:**

1. `GET /health` on care-episode reports **0.7.1** and user **0.8.2**.
2. `SELECT version_num FROM alembic_version` on user and care-episode Postgres reports **`002`** and **`008`** ([Database migrations](#database-migrations)).
3. CDP footer reports **UI 2026.06.16**.
4. Clinician dashboard lists catalog patients with last-chat timestamps and risk summary icons (mix of low/medium/high after seed).
5. Demo workspace bootstrap completes without 403 on recovery create.
6. Re-run `scripts/seed_demo_platform.py` on staging with operator/clinician JWT; confirm `risk-summaries: 12 ok`.

**Evidence:** Health JSON version fields; clinician roster screenshot; seed script output.

---

## CDP UI 2026.06.15 / capabilities v0.7.1 / chat v0.6.2

**Release pins:** CDP UI **2026.06.15**; **authentication v0.37.0**; **user v0.8.1**; **chat v0.6.2**; **care-episode v0.7.0**; **capabilities v0.7.1**; **cdp-policies v0.2.0**.

**Prerequisites:**

- Staging `VITE_*_API_URL` values for authentication, capabilities, user, chat, care-episode, and template.

**Deploy:**

1. Redeploy **chat v0.6.2** and **capabilities v0.7.1** ([Database migrations](#database-migrations) — automated on redeploy; no new chat revisions in this release).
2. Redeploy CDP UI **2026.06.15** after backend services are healthy.

**Post-deploy verification:**

1. `GET /health` on chat and capabilities reports **0.6.2** and **0.7.1**.
2. CDP footer reports **UI 2026.06.15**.
3. Platform admin can open **Admin → Users** and **Admin → Services**.
4. Patient and clinician chat flows work for an enrolled demo patient, including an empty-chat-history patient.
5. Corporate/SPAWN theme toggle and Terms-of-service review render in staging.

**Evidence:** Health JSON version fields; staging screenshots for footer/theme/TOS; clinician patient chat response.

---

## cdp-policies v0.2.0 / user v0.8.1

**Release pins:** **cdp-policies v0.2.0**; **user v0.8.1**; **capabilities** redeploy when bumping to this bundle (other backend pins unchanged from **2026.06.14**).

**Deploy:**

1. Redeploy **user v0.8.1** (image bundles `cdp-policies v0.2.0`).
2. Redeploy **capabilities** when moving to the v0.2.0 policy bundle pin.

**Post-deploy verification:**

1. `GET /health` on user reports **0.8.1**.
2. Platform admin list/patch, site clinician roster, and sponsor clinical-ops list authorize as before.

**Evidence:** Health version **0.8.1**; authorized user API responses for platform, site, and sponsor principals.

---

## CDP UI 2026.06.14 (authorization middleware v0.7.1)

**Release pins:** CDP UI **2026.06.14**; **authentication v0.37.0**; **user v0.8.0**; **chat v0.6.0**; **care-episode v0.7.0**; **capabilities v0.7.0**; **cdp-policies v0.1.0**.

**Prerequisites:**

- [Database migrations](#database-migrations) to head on authentication, user, chat, and care-episode databases.

**Deploy:**

1. Redeploy **authentication v0.37.0**, **user v0.8.0**, **chat v0.6.0**, **care-episode v0.7.0**, and **capabilities v0.7.0**.
2. Redeploy CDP UI **2026.06.14** after backend services are healthy.

**Post-deploy verification:**

1. `GET /health` on each service reports the pinned semver (**0.37.0**, **0.8.0**, **0.6.0**, **0.7.0**, **0.7.0**).
2. Platform operator can list registered users and care episodes without **403** when the active session role is entitled.
3. Patient **Care assistant** and clinician patient chat flows work end-to-end.

**Evidence:**

- Platform health dashboard all services healthy.
- `GET /health` JSON version fields for authentication, user, chat, care-episode, and capabilities.

---

## CDP UI 2026.06.11 (chat v0.4.0 client)

**Release pins:** CDP UI **2026.06.11**; **chat v0.4.0**.

**Deploy:**

1. Redeploy **chat v0.4.0** per [chat INSTALLATION_PLAN](https://github.com/Neosofia/chat/blob/main/INSTALLATION_PLAN.md).
2. Redeploy CDP UI **2026.06.11** in the same change window.

**Verify:**

- Patient **Care assistant** and clinician patient chat work end-to-end.

---

## CDP UI 2026.06.10 (authorization middleware v0.4.23)

**Release pins:** CDP UI **2026.06.10**; **authentication v0.33.0**; **user v0.7.0**; **chat v0.3.0**; **care-episode v0.3.0**; **capabilities v0.6.0**; **cdp-user-policies v0.2.1** unchanged.

**Prerequisites:**

- [Database migrations](#database-migrations) to head on authentication, user, chat, and care-episode databases.
- Staging `VITE_*_API_URL` values for authentication, capabilities, user, chat, care-episode, and template.

**Deploy:**

1. Redeploy **authentication v0.33.0**, **user v0.7.0**, **chat v0.3.0**, **care-episode v0.3.0**, and **capabilities v0.6.0**.
2. Redeploy CDP UI **2026.06.10** after backend services are healthy.

**Post-deploy verification:**

1. `GET /health` on each service reports the pinned semver (**0.33.0**, **0.7.0**, **0.3.0**, **0.3.0**, **0.6.0**).
2. Platform operator can list registered users and care episodes without **403** when the active session role is entitled.
3. Patient **Care assistant** and clinician patient chat flows still work end-to-end.

**Evidence:**

- Screenshot of platform health dashboard showing all services healthy.
- `GET /health` JSON version fields for authentication, user, chat, care-episode, and capabilities.

## CDP UI 2026.06.05 (chat v0.2.2 / care-episode v0.2.3)

**Release pins:** CDP UI **2026.06.05**; **chat v0.2.2**; **care-episode v0.2.3**.

**Prerequisites:**

- [Database migrations](#database-migrations) to head on chat and care-episode databases.
- Staging `VITE_CHAT_API_URL` and `VITE_CARE_EPISODE_API_URL` point at the deployed services.

**Deploy:**

1. Redeploy **chat v0.2.2** and **care-episode v0.2.3**.
2. Redeploy CDP UI **2026.06.05** after backend services are healthy.

**Post-deploy verification:**

1. Re-run `scripts/seed_demo_platform.py` against staging (requires operator JWT and migration DB URLs for chat and care-episode).
2. Patient: open **Care assistant**, send a message, start a **New chat** when sidebar shows multiple threads.
3. Clinician: open a patient, send a reply; patient thread shows **Care team** badge and no AI reply in that thread.

**Evidence:**

- Screenshot of patient conversations sidebar with **Care team** badge.
- `GET /health` on chat reports **0.2.2** and care-episode **0.2.3**.

## CDP UI 2026.06.05 (user v0.6.9 authz patch)

**Release pins:** **user v0.6.9**; **cdp-user-policies v0.2.1** unchanged.

**Deploy:**

1. Redeploy **user v0.6.9**.

**Post-deploy verification:**

1. Multi-role operator: **Registered users** stat and **Admin → Users** work under **Platform Admin** session role.

## CDP UI 2026.06.05 (provisioning patch)

**Release pins:** **user v0.6.8**; **cdp-user-policies v0.2.1**; CDP UI **2026.06.05** unchanged unless repinned.

**Prerequisites:**

- Authentication **service registry** `user` row: **HTTPS** `base_url` (not `http://user.railway.internal:…`).

**Pre-deploy configuration:**

- Set `ROLE_CATALOG_OVERLAY=/app/policies/role-catalog.json` on the user service (cloud).
- Optional: set `USER_SERVICE_BASE_URL` on authentication to the same HTTPS user URL for future migration `005` runs.

**Deploy:**

1. Redeploy **user v0.6.8**.
2. Update Authentication `services.base_url` for `user` to HTTPS if still on internal HTTP.

**Post-deploy verification:**

1. Fresh login provisions a registry row with **`roles: []`**; complete [Greenfield Step 0](#greenfield-step-0--assign-platform-registry-roles) before expecting tier-2 roles in the session picker.
2. Auth logs: `user_provisioning_succeeded`, not `user_provisioning_failed` with `status_code=302`.

**Evidence:**

- Step 0 complete for the platform admin; session role picker lists assigned tier-2 roles (for example Site Clinical and Patient on demo multi-role users).

## CDP UI 2026.06.05

**Release pins:** CDP UI **2026.06.05**; **authentication v0.32.2**; **user v0.6.7**; **care-episode v0.2.2**; **cdp-user-policies v0.2.0**.

**Prerequisites:**

- Care-episode migration **004** (`last_activity` on sessions) — see [care-episode INSTALLATION_PLAN](https://github.com/Neosofia/care-episode/blob/main/INSTALLATION_PLAN.md) and [Database migrations](#database-migrations).
- WorkOS tier-1 actors for demo users: **operator**, **clinician**, **patient** (and **study** when testing sponsor roles).
- Staging `VITE_*_API_URL` values, including `VITE_CARE_EPISODE_API_URL`.

**Deploy:**

1. [Database migrations](#database-migrations) to head on authentication, user, and care-episode (automated on Railway redeploy).
2. Redeploy **authentication v0.32.2**, **user v0.6.7**, and **care-episode v0.2.2**.
3. Redeploy CDP UI **2026.06.05**.

**Post-deploy verification:**

1. Log in with a multi-actor demo user; session picker lists tier-2 roles with human-readable labels (requires Step 0 or demo seed for tier-2 assignments).
2. Switch to **patient** — patient dashboard shows upcoming appointments, messages, and recent records (not records-only).
3. After WorkOS adds tier-1 **`operator`**, assign tier-2 roles (Step 0 or **Admin → Users**); **`platform.admin` is not inferred from WorkOS actor class**.
4. Operator **clone-demo** path still works for seeding a new patient UUID.

**Evidence:**

- Screenshot of full patient dashboard (stat row plus appointments and messages sections).
- `GET /health` from care-episode reports **0.2.2**.

## CDP UI 2026.06.04

**Release pins:** CDP UI **2026.06.04**; **authentication v0.32.2**; **user v0.6.5**.

**Prerequisites:**

- User migration **002** adds `tos_accepted_at` — expected `alembic_version.version_num` **`002`** on user Postgres ([Database migrations](#database-migrations)).
- WorkOS **`operator`** role for platform admin testers.
- Staging `VITE_AUTH_API_URL`, `VITE_USER_API_URL`, and other `VITE_*_API_URL` values.

**Deploy:**

1. [Database migrations](#database-migrations) to head on authentication and user (automated on Railway redeploy).
2. Redeploy **authentication v0.32.2** and **user v0.6.5**.
3. Redeploy CDP UI **2026.06.04**.

**Post-deploy verification:**

1. Log in as **`operator`** — home title reads **Platform Admin Dashboard**; breadcrumb **Dashboard**.
2. **Failed sign-ins (24h)** stat and **Recent audit events** include identity-provider failures when present.
3. New human users see the terms-of-service gate until acceptance is saved on the profile.
4. **Admin → Users** and **Admin → Services** remain available for registry operations.

**Evidence:**

- Screenshots of operator dashboard stat row and audit feed with a test failed sign-in (no PHI in tickets).
- Record of successful ToS acceptance for one test user.

## CDP UI v0.2.0

**Release pins:** CDP UI **v0.2.0**; **authentication v0.30.0**; **user v0.2.0**.

**Prerequisites:**

- Authentication and User services deployed per their installation plans for the same tags.
- WorkOS **`operator`** role assigned for registry/admin testers.
- Staging `VITE_USER_API_URL` (alongside other `VITE_*_API_URL` values).

**Deploy:**

1. Redeploy CDP UI **v0.2.0**.

**Post-deploy verification:**

1. Log in as WorkOS **`operator`** (role picker → **operator** if you have multiple roles).
2. **Admin → Users** — list loads (empty is OK).
3. Edit an existing user's platform roles; save succeeds.

**Evidence:**

- Deploy config record showing `VITE_USER_API_URL` (no secrets).
- Screenshots or test script output for Admin → Users list and successful role save.
