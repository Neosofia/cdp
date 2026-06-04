# Changelog


## [Unreleased]

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
