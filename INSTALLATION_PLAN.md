# Product Installation Plan

Per-version instructions for system administrators: prerequisites, deploy and configuration steps, post-deploy verification, and evidence to capture. For what changed in each release, see [CHANGELOG.md](CHANGELOG.md).

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

1. Log in with a multi-actor demo user; session picker lists tier-2 roles with human-readable labels.
2. Switch to **patient** — patient dashboard shows upcoming appointments, messages, and recent records (not records-only).
3. Re-login after WorkOS adds **operator** — **platform.admin** appears when catalog defaults apply.
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
