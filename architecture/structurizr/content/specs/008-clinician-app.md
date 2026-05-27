## Feature Specification: Clinician App (Escalation, Patient Records & Portal)

**Feature Branch**: `008-clinician-app`
**Created**: 2026-04-17
**Status**: Draft
**Input**: A browser-based web application exclusively for clinicians. The primary workflow
is: receive an escalation platform alert → click the deep link → authenticate → land on a
two-panel view showing the live AI-patient chat (left) and the patient's EHR records since
discharge (right) → take over the chat or request patient consent for a call. Clinicians
are a US regional pool and are not pre-assigned to specific patients.

> **Scope note**: This spec covers the **clinician-facing** app only. The
> **patient-facing** chat app (iOS, Android, Web) is specified in
> [spec 007](007-patient-chat-app.md).


### User Scenarios & Testing

#### User Story 1 — Clinician Responds to an Escalation Alert (Priority: P1)

A clinician receives an escalation platform alert (e.g., PagerDuty) containing a deep link with `patient_uuid` and
`chat_session_uuid` as query parameters (no PII in the URL). They click the link,
authenticate via the platform login, and land on the alert detail view. The view is a
two-panel layout: the left panel shows the live AI-patient chat window (streaming in real
time, scrolled to the most recent message, with full session history accessible by scrolling
up); the right panel shows the patient's EHR records since last discharge, including
procedure records, sourced from the EMR service.

The clinician has two actions available:
- **Stop AI & Take Over**: permanently halts the AI agent for this session (enforced by the
  AI agent service). The clinician's chat input is enabled. The first message the clinician
  sends is preceded by an automated system message to the patient: "You're now chatting
  with [clinician first name]".
- **Request Consent to Call**: sends an in-app Accept/Decline prompt to the patient's chat
  window. On acceptance, a **Call Patient** button appears in the clinician's view. On
  decline, the clinician is notified in the UI.

**Why this priority**: This is the entire purpose of the app. Everything else supports this
workflow.

**Independent Test**: Trigger a synthetic alert; follow the deep link as an unauthenticated
clinician; verify redirect to login then return to the exact alert URL. Verify the two-panel
layout: live chat on the left, EHR records on the right. Verify "Stop AI & Take Over" halts
AI responses and enables the clinician input. Verify the consent-to-call flow delivers the
in-app prompt and surfaces "Call Patient" on acceptance.

**Acceptance Scenarios**:

1. **Given** a clinician follows the escalation platform deep link, **When** they are unauthenticated,
   **Then** they are redirected to login via OAuth2 PKCE with the original URL preserved in
   `state`/`redirect_uri`, and returned to the exact alert URL after successful authentication.
2. **Given** an authenticated clinician lands on the alert detail, **Then** the left panel
   shows the live AI-patient chat (scrolled to latest message) and the right panel shows the
   patient's post-discharge EHR and procedure records from the EMR service.
3. **Given** a clinician clicks "Stop AI & Take Over", **When** confirmed, **Then** the AI
   agent service permanently halts the AI for this session, the clinician's chat input is
   enabled, and the first clinician message is preceded by a system message "You're now
   chatting with [clinician first name]" visible to the patient.
4. **Given** a clinician clicks "Request Consent to Call", **When** sent, **Then** the
   patient's chat window shows an Accept/Decline prompt; on acceptance the clinician sees
   a "Call Patient" button; on decline the clinician is notified and the chat remains active.
5. **Given** a clinician without the required role attempts to access a patient alert,
   **When** the request is made, **Then** they see an access-denied page and the attempt
   is audit-logged.

---

#### User Story 2 — Clinician Claims a High-Risk Session Before Escalation Fires (Priority: P2)

When the risk agent flags a patient chat session as high-risk, a 60-second early-intervention
window opens. During this window the session appears in a live queue visible to all available
clinicians in the region. Any free clinician can self-assign and open the two-panel alert
detail view (User Story 1) before the escalation platform fires. If no clinician claims it within
60 seconds, the escalation platform fires as normal.

**Why this priority**: The escalation platform is the fallback escalation path, not the first line of
response. Clinicians already logged into the portal can resolve lower-severity or borderline
cases instantly, reducing unnecessary escalation pages and on-call burden.

**Independent Test**: Trigger a synthetic high-risk signal; verify the session appears in
the queue within 5 seconds; claim it as a free clinician before 60 seconds elapse; verify
the escalation platform does NOT fire. Let a second synthetic alert expire unclaimed; verify the escalation platform
fires after 60 seconds.

**Acceptance Scenarios**:

1. **Given** the risk agent flags a session as high-risk, **When** the flag is raised,
   **Then** the session appears in the clinician queue within 5 seconds with a visible
   60-second countdown timer and the risk signal indicator.
2. **Given** a free clinician clicks to claim a queued session within the 60-second window,
   **When** they claim it, **Then** they are taken to the two-panel alert detail view and
   the session is removed from the queue for all other clinicians (preventing double-claim).
3. **Given** no clinician claims the session within 60 seconds, **When** the window expires,
   **Then** the escalation platform is triggered and the session moves to the escalated state
   in the queue (still visible but marked as escalated).
4. **Given** a clinician has already claimed a session via escalation platform deep link, **When**
   another clinician views the queue, **Then** that session is shown as claimed and cannot
   be double-assigned.

---

#### User Story 3 — Clinician Reviews Closed Sessions for AI Quality (Priority: P3)

When no active alerts require attention, a clinician can browse a list of closed chat
sessions from their region and review the quality of the AI's responses. For each session
they can submit a thumbs up or thumbs down rating and an optional free-text comment. This
data feeds the AI quality feedback loop.

**Why this priority**: Clinicians are the most qualified reviewers of AI clinical response
quality. Structured feedback during idle time is low-effort to collect and high-value for
model improvement.

**Independent Test**: Navigate to the closed sessions list as an authenticated clinician;
verify sessions are listed with key metadata (date, risk signal type); open a session;
verify the full chat transcript is readable; submit a thumbs-down rating with a comment;
verify the rating is persisted and visible on the session record.

**Acceptance Scenarios**:

1. **Given** a clinician navigates to the quality review section, **Then** they see a list
   of closed chat sessions from their region, ordered by most recent, with session date
   and risk signal type displayed.
2. **Given** a clinician opens a closed session, **Then** they see the full chat transcript
   (AI, patient, and any clinician messages) in read-only mode.
3. **Given** a clinician selects thumbs up or thumbs down and optionally enters a comment,
   **When** they submit, **Then** the rating and comment are saved against the session and
   a confirmation is shown.
4. **Given** a session has already been rated by this clinician, **When** they open it,
   **Then** their existing rating and comment are pre-populated and can be updated.

---

#### Edge Cases

- What happens if the real-time connection drops while the clinician is viewing the live chat?
- What happens if two clinicians click "Stop AI & Take Over" on the same session simultaneously?
- What happens if the patient declines the consent-to-call request after the AI has already been halted (patient left with no responder)? A: clinician can continue with the web chat.
- What happens when the clinician's session token expires mid-alert-review?
- How are very long conversation threads rendered without browser memory issues?

### Requirements

#### Functional Requirements

- **FR-001**: The clinician app MUST function correctly on the current and prior major
  versions of Chrome, Firefox, Safari, and Edge.
- **FR-002**: The clinician app MUST be responsive across desktop viewports; the two-panel
  layout (chat left, EHR right) MUST remain usable at widths from 1024px to 2560px.
- **FR-003**: All API communication MUST use HTTPS (TLS 1.2+); no mixed-content requests
  are permitted.
- **FR-004**: Clinician authentication MUST use a platform-issued short-lived session token
  stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie; no tokens in `localStorage`
  or URL parameters.
- **FR-005**: The app MUST use a persistent real-time connection for
  real-time chat streaming and alert queue updates; the connection MUST auto-reconnect with
  exponential backoff on drop.
- **FR-006**: When the risk agent flags a session as high-risk, the clinician portal MUST
  display the session in the early-intervention queue within 5 seconds, with a visible
  60-second countdown timer and the risk signal indicator. Any authenticated clinician in
  the region MUST be able to self-assign (claim) the session within that window, which
  opens the two-panel alert detail view and removes the session from the queue for all
  other clinicians atomically (no double-claim). If unclaimed after 60 seconds, the portal
  MUST trigger the escalation platform notification and mark the session as escalated in the queue.
- **FR-007**: The escalation platform alert deep link MUST carry `patient_uuid` and `chat_session_uuid`
  as query parameters. Unauthenticated clinicians MUST be redirected to login via OAuth2
  PKCE with the full original URL encoded in `state`/`redirect_uri` and returned to the
  exact alert URL after authentication. The redirect target MUST be validated against an
  allowlist of platform-owned origins to prevent open-redirect attacks.
- **FR-008**: The alert detail view MUST use a two-panel layout: left panel shows the live
  AI-patient chat window (streamed in real time, default scroll position at the most recent
  message, full session history accessible by scrolling up); right panel shows the patient's
  EHR records since last discharge including procedure records, sourced from the EMR service.
  Patient identity is resolved server-side from `patient_uuid`; no PHI is carried in the URL.
- **FR-009**: The alert detail view MUST provide a "Stop AI & Take Over" action that
  instructs the AI agent service to permanently halt the AI for this session. On activation,
  the clinician's chat input MUST be enabled and the first message sent MUST be preceded by
  an automated system message to the patient: "You're now chatting with [clinician first name]".
- **FR-010**: The alert detail view MUST provide a "Request Consent to Call" action that
  delivers an in-app Accept/Decline prompt to the patient's active chat channel. On patient
  acceptance, a "Call Patient" button MUST appear in the clinician's view. On patient
  decline, the clinician MUST be notified in the UI.
- **FR-011**: Clinician messages sent after takeover MUST be routed through the chat service
  in the same thread (sender type `clinician`), with optimistic display and a pending
  indicator updated to confirmed on server acknowledgement.
- **FR-012**: Browser push notifications MUST be supported for clinicians
  (new alert in queue), with explicit opt-in; notification payloads MUST NOT contain PHI.
- **FR-013**: The app MUST prevent PHI leakage via browser APIs: views MUST set
  `autocomplete="off"` on input fields; no PHI MUST appear in notification payloads;
  EHR and chat content MUST NOT be cached in `localStorage` or `IndexedDB`.
- **FR-014**: The chat panel MUST display a clear visual distinction between AI agent
  messages, clinician messages, and patient messages.
- **FR-015**: The clinician portal MUST provide a quality review section listing closed
  chat sessions from the clinician's region, ordered by most recent. Each session MUST be
  openable in a read-only transcript view. The clinician MUST be able to submit a thumbs
  up / thumbs down rating and an optional free-text comment per session; submissions MUST
  be persisted and re-editable. Previously submitted ratings and comments MUST be
  pre-populated when the session is reopened.

#### Key Entities

Apps do not own entities. Canonical entity definitions live in the services that store and manage them:

- **AlertQueueItem** → **005 Notification Service** (`EscalationAlert`)
- **ChatMessage** → **001 Chat Service** (`Message`)
- **EHRRecord** → **004 EMR Service** (`FHIRCacheEntry` / `PatientContext`)
- **ConsentRequest / SessionReview** → **001 Chat Service** *(entities relocated to that spec)*
- **ClinicianSession** → **014 Auth Service** (`UserSession`)
- **WebPushSubscription** → **013 Devices Service** (`DeviceRegistration`)

### Success Criteria

#### Measurable Outcomes

- **SC-001**: 95% of clinician messages sent after takeover are confirmed by the chat service
  within 2 seconds under normal network conditions.
- **SC-002**: High-risk sessions appear in the early-intervention queue within 5 seconds of
  the risk agent flag for 99% of cases. Escalation platform notification fires within 5 seconds of the
  60-second window expiring when unclaimed. The 60-second early-intervention window itself
  is intentional hold time and is explicitly excluded from all escalation SLOs.
- **SC-003**: The clinician alert detail view achieves a Lighthouse performance score of ≥80.
- **SC-004**: The clinician portal passes WCAG 2.1 AA automated accessibility audit.
- **SC-005**: Zero PHI values appear in browser notification payloads or `localStorage`,
  verified by automated browser tests.
- **SC-006**: Real-time connection reconnection occurs within 5 seconds of a simulated connection drop,
  with no message loss during live chat streaming.
- **SC-007**: The app renders without layout issues on Chrome, Firefox, Safari, and Edge
  (current and prior major versions).

### Assumptions

- The web app is a single-page application communicating with the platform API gateway; it
  does not have direct access to backend services.
- Clinician authentication uses OAuth2/OIDC (authorization code flow with PKCE) provided by the Authentication Service (`014-authentication-service`); hospital
  SSO support is deferred to a future version.
- Clinicians are a US regional pool — not pre-assigned to specific patients; any authenticated
  clinician in the region can view any patient in that region's alert queue.
- The AI agent service enforces the halt-on-clinical-intervention rule; the clinician app
  triggers it via an API call but does not implement the halt logic itself.
- Concurrent clinician takeovers on the same session (two clinicians clicking "Stop AI"
  simultaneously) and the scenario where a patient declines consent after the AI is already
  halted are deferred to the planning phase for conflict resolution design.
- Content Security Policy (CSP) headers are set at the API gateway / CDN layer.
- The frontend framework choice (React, Vue, etc.) is deferred to the planning phase.
