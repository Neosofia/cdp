# Clinician App

## Why we need this app

When the AI risk agent flags a patient conversation, clinicians need to act in seconds -- not after hunting through separate systems for chat history and post-discharge records. On-call pages must land them on a single view where they can read the live thread, review relevant EHR context, halt the AI, and continue the conversation or request consent to call. Clinicians work as a regional pool and are not pre-assigned to individual patients; any authenticated clinician in the region must be able to respond.

The Clinician App is a browser-based portal for that workflow. Its primary path is: receive an escalation platform alert, follow a deep link, authenticate, and land on a two-panel alert detail -- live AI-patient chat on the left, post-discharge EHR records on the right. A secondary path lets clinicians already logged into the portal claim high-risk sessions during the **60-second early-intervention window** before an on-call page fires at all.

## How this app fits into the platform

The Notification Service publishes high-risk alerts to the portal queue and, after the early-intervention window expires unclaimed, triggers the escalation platform. Escalation incidents include a deep link with `patient_uuid` and `chat_session_uuid` query parameters -- opaque identifiers only, no PHI in the URL. Unauthenticated clinicians are redirected through OAuth2 PKCE login with the original URL preserved, then returned to the exact alert view after authentication.

The alert detail view streams chat from the Chat Service in real time and loads post-discharge EHR and procedure records from the EMR Service, resolving patient identity server-side from the opaque uuid. "Stop AI & Take Over" calls the AI agent service to permanently halt automated replies for the session; the first clinician message is preceded by a system message visible to the patient ("You're now chatting with [clinician first name]"). "Request Consent to Call" delivers an in-app Accept/Decline prompt to the patient's chat channel; on acceptance a Call Patient control appears for the clinician.

When no active alerts require attention, clinicians can review closed sessions from their region, rate AI response quality, and leave optional comments -- feeding the platform's AI quality feedback loop. The patient-facing chat app is specified separately; the two applications share no screens but may share design tokens and API client code. Platform baseline (spec 000) applies to HTTPS transport, PHI-safe telemetry, and accessibility.

## Client objectives

**On-call clinicians responding to a page** want one click from the escalation alert to a authenticated, two-panel view -- live chat and post-discharge records together -- so they can assess risk and intervene without tab switching or manual record lookup.

**Clinicians already in the portal** want to see high-risk sessions appear in a live queue within seconds, claim one before the 60-second window expires, and prevent an unnecessary on-call page when they can handle the case immediately.

**Clinicians taking over a session** need clear controls to stop the AI, message the patient in the same thread, and optionally request phone consent -- with the patient seeing who is now responding.

**Clinicians between alerts** want a low-friction way to review closed conversations and flag good or poor AI responses, contributing structured feedback without a separate tooling login.

## Functional requirements

- **FR-001**: The two-panel alert layout (chat left, EHR right) remains usable on desktop viewports from 1024px to 2560px wide.

- **FR-002**: The app maintains a persistent real-time connection for live chat streaming and alert queue updates. The connection auto-reconnects with exponential backoff on drop.

- **FR-003**: When the risk agent flags a session as high-risk, the portal displays the session in the early-intervention queue within five seconds, with a visible 60-second countdown timer and the risk signal indicator. Any authenticated clinician in the region may self-assign (claim) the session within that window, which opens the two-panel alert detail view and removes the session from the queue for all other clinicians atomically -- no double-claim. If unclaimed after 60 seconds, the escalation platform notification fires and the session is marked escalated in the queue (still visible but no longer claimable as an open intervention).

- **FR-004**: Escalation platform alert deep links carry `patient_uuid` and `chat_session_uuid` as query parameters. Unauthenticated clinicians are redirected to login via OAuth2 PKCE with the full original URL encoded in state/redirect_uri and returned to the exact alert URL after authentication. The redirect target is validated against an allowlist of platform-owned origins to prevent open-redirect attacks.

- **FR-005**: The alert detail view uses a two-panel layout. The left panel shows the live AI-patient chat streamed in real time, default scroll position at the most recent message, with full session history accessible by scrolling up. The right panel shows the patient's EHR records since last discharge, including procedure records, sourced from the EMR service. Patient identity is resolved server-side from `patient_uuid`; no PHI is carried in the URL.

- **FR-006**: The alert detail view provides a "Stop AI & Take Over" action that instructs the AI agent service to permanently halt the AI for this session. On activation the clinician's chat input is enabled, and the first message sent is preceded by an automated system message to the patient: "You're now chatting with [clinician first name]".

- **FR-007**: The alert detail view provides a "Request Consent to Call" action that delivers an in-app Accept/Decline prompt to the patient's active chat channel. On patient acceptance a Call Patient control appears in the clinician's view. On decline the clinician is notified in the UI and may continue via web chat.

- **FR-008**: Clinician messages sent after takeover are routed through the chat service in the same thread (sender type clinician), with optimistic display and a pending indicator updated to confirmed on server acknowledgement.

- **FR-009**: The chat panel displays a clear visual distinction among AI agent messages, clinician messages, and patient messages.

- **FR-010**: Browser push notifications are supported for new alerts in the queue, with explicit opt-in. Notification payloads contain no PHI.

- **FR-011**: The app prevents PHI leakage via browser APIs: input fields use autocomplete disabled where appropriate; EHR and chat content are not cached in localStorage or IndexedDB; notification payloads contain no clinical content.

- **FR-012**: Clinicians without the required role who attempt to access a patient alert see an access-denied page; the attempt is audit-logged.

- **FR-013**: The portal provides a quality review section listing closed chat sessions from the clinician's region, ordered by most recent, with session date and risk signal type displayed. Each session opens in a read-only transcript view. The clinician may submit a thumbs up or thumbs down rating and an optional free-text comment per session; submissions persist and are re-editable, with existing ratings pre-populated when the session is reopened.

- **FR-014**: Sessions already claimed by another clinician (via portal queue or escalation deep link) appear as claimed in the queue and cannot be double-assigned.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Events support **measuring** queue appearance latency, claim and takeover success, message confirmation after takeover, real-time reconnection behaviour, and access-denied attempts. The 60-second early-intervention window is intentional hold time and is excluded from escalation SLA measurement.

- **OR-002**: Content Security Policy headers are set at the API gateway or CDN layer. Hospital SSO is deferred.

- **OR-003**: Concurrent clinician takeovers on the same session and the scenario where a patient declines consent after the AI is already halted are resolved through backend conflict handling -- the app triggers actions via API calls but does not implement halt or assignment logic itself.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Notification service spec: [005-notification-service.md](https://github.com/Neosofia/cdp/blob/main/specs/005-notification-service.md)
- AI risk agent service spec: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Chat service spec: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- EMR service spec: [004-emr-service.md](https://github.com/Neosofia/cdp/blob/main/specs/004-emr-service.md)
- Devices service spec: [013-devices-service.md](https://github.com/Neosofia/cdp/blob/main/specs/013-devices-service.md)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- Patient chat app spec: [007-patient-chat-app.md](https://github.com/Neosofia/cdp/blob/main/specs/007-patient-chat-app.md)
