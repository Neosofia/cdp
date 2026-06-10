# Changelog


## [Unreleased]

## [2026.06.10] - 2026-06-10

**Pinned services:** authentication **v0.33.0**; user **v0.7.0**; chat **v0.3.0**; care-episode **v0.3.0**; capabilities **v0.6.0**; **cdp-user-policies v0.2.1** unchanged.

### Changed

- `docker-compose.dev.yml` pins the full platform stack on GHCR release images (adds chat and care-episode alongside authentication, user, and capabilities).
- Backend services ship **authorization-in-the-middle v0.4.23** with simplified `@with_security()` route decorators.

## [2026.06.05 chat] - 2026-06-05

**Pinned services:** chat **v0.2.2**; care-episode **v0.2.3**.

### Added

- Patient **Care assistant** supports multiple conversation threads, a conversations sidebar, and a **Care team** badge when a clinician has joined a thread.
- Clinician patient chat: session pagination, direct replies (assistant paused for that thread), and compose with clinician name and role.
- Patient banner suggests **New chat with assistant** while the care team is responding in the current thread.

### Changed

- Chat history and completions use the chat service interaction model (care-episode no longer stores transcripts).
- Demo platform seed script seeds `chat_interactions` and messages for catalog patients.

## [2026.06.05 authz patch] - 2026-06-05

**Pinned services:** user **v0.6.9**; **cdp-user-policies v0.2.1** unchanged.

### Fixed

- Platform operators with multiple tier-2 roles (e.g. `site.clinical` and `platform.admin`) no longer get **403 Forbidden** on **Registered users** when the active session role is **Platform Admin**.

## [2026.06.05 provisioning] - 2026-06-05

**Pinned services:** user **v0.6.8**; **cdp-user-policies v0.2.1**.

### Fixed

- Login-time User registry provisioning on cloud stacks when Authentication pointed at an HTTP internal User URL (Talisman redirect); operators must register an HTTPS `base_url` for `user`.
- Default tier-2 roles on first login when the user service loads the CDP role catalog overlay from **cdp-user-policies v0.2.1** (`ROLE_CATALOG_OVERLAY=/app/policies/cdp-overlay.json`).

## [2026.06.05] - 2026-06-05

**Pinned services:** authentication **v0.32.2**; user **v0.6.7**; care-episode **v0.2.2**; **cdp-user-policies v0.2.0**.

### Added

- Role catalog **default_roles_by_actor** maps each tier-1 actor (patient, clinician, study, operator) to a default tier-2 org role for demo and first-login provisioning.
- Patient dashboard loads appointments, inbox, and records from care-episode when switching to the **patient** role.

### Changed

- Switching to **patient** runs care-episode **clone-demo** using operator, clinician, or patient JWT actors (not operator-only).
- `docker-compose.dev.yml` pins **user v0.6.7**.

### Fixed

- Patient dashboard no longer stays half-empty after a failed demo clone; care-episode repairs incomplete demo rows and the UI waits for seeding before fetching.
- Default **VITE_CARE_EPISODE_API_URL** falls back to `http://localhost:8015` when unset in local Vite builds.

## [2026.06.04] - 2026-06-04

**Pinned services:** authentication **v0.32.2**; user **v0.6.5**.

### Added

- Footer shows the CDP UI release date (**CalVer** `YYYY.MM.DD`).
- Operator dashboard **Service health** probes each configured platform API (`GET /health`) and shows live semver versions.
- Operator dashboard **failed sign-ins (24h)** stat and identity-provider failures in the **Recent audit events** feed (authentication `GET /api/idp/failed-authentications`).
- Role-specific home page titles (for example **Platform Admin Dashboard**) with breadcrumb still **Dashboard**.
- Terms-of-service acceptance gate on login; profile stores `tos_accepted_at` via User service.
- Clinicians can edit a patient's profile from the patient view.
- Enrollment flow includes a procedure catalog and clearer enroll sheet when adding patients to the roster.

### Changed

- Patient roster risk indicators use each patient's care-episode risk level instead of a generic featured flag.
- When a profile save fails, the error message names which service returned the problem (easier to tell user vs care-episode issues apart).
- `docker-compose.dev.yml` pins published authentication and user images for dev stacks.

### Fixed

- Roster risk levels display correctly when care-episode tenant data does not match the roster tenant.
- Railway production build: removed unused TypeScript variable in failed-sign-in counter (`tsc -b`).
- Footer **TOS** link and `/tos-preview` crawl route available in production and staging builds (not dev-only).

## [0.2.1] - 2026-05

### Changed

- Role names in the header, admin screens, and session picker show human-readable clinical labels (for example "Clinical Research Coordinator" instead of raw slugs).
- Session restore loads your profile more reliably after login.

### Removed

- Debug-only copy in the patient context panel (operator/debug menus unchanged).

## [0.2.0] - 2026-05

### Added

- **Admin → Users** for platform operators: browse users in the tenant, open a user, and edit their platform roles.
- **Admin → Users** and **Admin → Services** audit history: open a user or service and review who changed what and when.
- Clinician and operator flows wired to chat and care-episode services for patient conversations and roster data.

### Changed

- Platform administration in the UI uses the **operator** actor (replaces the old **admin** label in menus and role picker).
