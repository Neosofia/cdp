# Changelog

## [2026.06.18]

### Added

- Clinician **care episode lifecycle** — close and reopen the active episode, start a new procedure, episode history selector, and bulk close from the patient roster.
- Playwright **E2E** harness (`ui/e2e/`) for clinician close/reopen on seeded catalog patient **DEMO-123**.

### Changed

- Session tokens refresh every **15 minutes** (half the 30-minute access token lifetime) instead of once near expiry, with refocus catch-up when the tab returns from the background.
- Chat and care-episode API calls retry once after **401** following a silent token refresh.
- Care-episode client uses episode-scoped routes (`/episodes`, `PATCH /{episode_uuid}`) aligned with **care-episode v0.8.0**.

### Fixed

- Long-lived browser sessions no longer hit **Chat API returned 401** when the access token expired before background-tab refresh timers fired.

## [2026.06.17]

### Changed

- UI capabilities use Cedar entity ids as entitlement keys (for example `ui::Menu::"clinician"`) — policy is the single source of truth; `entitlements.json` is removed.
- Platform policy bundle reorganized under `policies/capabilities/ui/`.

## [2026.06.16]

### Changed

- Clinician roster lists patients for your organization and shows each patient's last chat activity.
- Risk summary tooltip on the clinician roster opens below the icon so it is not clipped under card headers.

### Fixed

- Demo workspace setup completes when creating a personal recovery for the signed-in patient.
- Demo patient roster shows a realistic mix of low, medium, and high risk summary levels.

## [2026.06.15]

### Added

- Corporate UI mode with theme toggle, refreshed shell, header, and footer, and Post Discharge Care Platform branding.
- Terms-of-service review flow before entering the demo workspace.

### Changed

- Patient, clinician, operator, and service-management screens share consistent themed forms and shell styling.

## [2026.06.05 chat]

### Added

- Patient **Care assistant** supports multiple conversation threads, a conversations sidebar, and a **Care team** badge when a clinician has joined a thread.
- Clinician patient chat: session pagination, direct replies (assistant paused for that thread), and compose with clinician name and role.
- Patient banner suggests **New chat with assistant** while the care team is responding in the current thread.

## [2026.06.05 authz patch]

### Fixed

- Platform operators with multiple organization roles (for example clinical and **Platform Admin**) can open **Registered users** while the active session role is **Platform Admin**.

## [2026.06.05]

### Added

- Enrollment forms pre-select a default organization role for each actor type (patient, clinician, study, operator).
- Patient dashboard loads appointments, inbox, and records from care-episode when you switch to the **patient** role.

### Fixed

- Patient dashboard no longer stays half-empty after a failed demo data setup; the UI waits for seeding to finish before loading dashboard data.

## [2026.06.04]

### Added

- Footer shows the CDP release date.
- Operator dashboard **Service health** probes each configured platform API and shows live service versions.
- Operator dashboard **failed sign-ins (24h)** stat and identity-provider failures in the **Recent audit events** feed.
- Role-specific home page titles (for example **Platform Admin Dashboard**) with breadcrumb still **Dashboard**.
- Terms-of-service acceptance gate on login.
- Clinicians can edit a patient's profile from the patient view.
- Enrollment flow includes a procedure catalog and a clearer enroll sheet when adding patients to the roster.

### Changed

- Patient roster risk indicators use each patient's care-episode risk level instead of a generic featured flag.
- When a profile save fails, the error message identifies which platform service returned the problem.

### Fixed

- Roster risk levels display correctly when care-episode tenant data does not match the roster tenant.
- Footer **TOS** link and terms preview are available in production and staging builds.

## [0.2.1] - 2026-05

### Changed

- Role names in the header, admin screens, and session picker show human-readable clinical labels (for example "Clinical Research Coordinator" instead of raw slugs).
- Session restore loads your profile more reliably after login.

### Removed

- Debug-only copy in the patient context panel (operator and debug menus unchanged).

## [0.2.0] - 2026-05

### Added

- **Admin → Users** for platform operators: browse users in the tenant, open a user, and edit their platform roles.
- **Admin → Users** and **Admin → Services** audit history: open a user or service and review who changed what and when.
- Clinician patient chat and patient roster data powered by the chat and care-episode services.

### Changed

- Platform administration in the UI uses the **operator** actor (replaces the old **admin** label in menus and the role picker).
