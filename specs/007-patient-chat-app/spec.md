# Feature Specification: Patient Chat App (iOS, Android & Web)

**Feature Branch**: `007-mobile-chat-app`
**Created**: 2026-04-17
**Status**: Draft
**Input**: A cross-platform app targeting iOS, Android, and web that allows post-discharge patients to communicate with the platform
via a chat interface. Patients interact with AI agents and, when escalated, with human
clinicians — all within the same thread. This is the primary high-engagement channel
for patients across all form factors.

> **Scope note**: This spec covers the **patient-facing** chat app only. The
> **clinician-facing** app (patient record review, escalation handling, etc.) is
> specified in [spec 008](../008-clinician-app/spec.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Patient Registers and Completes Secure Onboarding (Priority: P1)

A newly discharged patient receives an invitation (SMS or email), downloads the app,
and completes identity verification to link their account to their EMR record before
their first chat session.

**Why this priority**: Every patient starts here. Without a verified identity, no clinical
data is accessible and no chat session can begin. All other stories depend on this.

**Independent Test**: Complete the full onboarding flow with a test patient account; verify
account is created, identity is linked to a test EMR record, and a first chat session
can be opened.

**Acceptance Scenarios**:

1. **Given** a patient receives an onboarding invitation link, **When** they tap the link
   and complete identity verification, **Then** their app account is created, linked to
   their EMR patient ID, and they are taken to an active chat session.
2. **Given** a patient fails identity verification three times, **When** the third attempt
   fails, **Then** the account is locked for 1 minute; after the lockout expires the
   patient is presented with a self-service option to resend the original invitation link
   and restart onboarding with a new password. No admin intervention is required for a
   standard lockout.
3. **Given** a returning patient opens the app, **When** they authenticate (biometric on
   mobile, password/PIN on web), **Then** they are taken directly to their active chat
   thread without repeating onboarding.

---

### User Story 2 — Patient Sends a Chat Message and Receives a Response (Priority: P1)

A patient opens the app, types a message about their symptoms or medication, and receives
a response from the AI agent within the same chat thread. The interaction feels like a
familiar chat UI (comparable to consumer messaging apps).

> **AI scope note**: This story covers only the app-side chat UX (message rendering,
> optimistic send, typing indicator, thread display). AI agent personality, clinical
> capabilities, escalation logic, and prompt configuration are specified in
> [spec 010 — AI Agent Service](../010-ai-agent-service/spec.md).

**Why this priority**: This is the core patient-facing value. Without working chat, the
platform delivers no post-discharge care.

**Independent Test**: A test patient account sends a message via the app; verify the message
appears in the chat thread, a typing indicator shows while the AI processes, and a response
appears within the target response time; verify the message was stored in the chat service.

**Acceptance Scenarios**:

1. **Given** a patient is authenticated and opens a chat session, **When** they send a
   message, **Then** the message appears in the thread immediately (optimistic UI) and
   the AI response appears within 10 seconds.
2. **Given** the app loses network connectivity mid-send, **When** connectivity is restored,
   **Then** the message is resent automatically and a single copy appears in the thread
   (no duplicates).
3. **Given** a clinician takes over the conversation following an escalation, **When** the
   clinician sends a reply, **Then** the patient's app shows the reply in the same thread
   with a visual indicator distinguishing clinician messages from AI messages.

---

### User Story 3 — Patient Receives a Push Notification for a New Message (Priority: P2)

When a new message (AI or clinician reply) is sent to the patient while the app is
backgrounded or closed, the patient receives a push notification. Tapping the
notification opens the app directly to the relevant chat thread.

**Why this priority**: Push notifications drive re-engagement. A patient who misses a
clinician follow-up message defeats the purpose of post-discharge care.

**Independent Test**: Send a new message to a patient whose app is backgrounded; verify a
push notification is delivered within 30 seconds; tap notification and verify the app opens
to the correct thread.

**Acceptance Scenarios**:

1. **Given** the app is backgrounded and a new message arrives, **When** the push
   notification is delivered, **Then** it appears within 30 seconds and tapping it
   opens the app to the correct chat thread.
2. **Given** the patient has disabled push notifications, **When** a new message arrives,
   **Then** no push notification is sent; a badge count and in-app indicator are updated
   when the patient next opens the app.

---

### Edge Cases

- How does the app behave when the server is unreachable (full offline mode)?
- What happens when a patient's session token expires mid-conversation?
- How does the app handle very long conversation threads (thousands of messages)?
- What accessibility requirements apply (VoiceOver/TalkBack, font scaling)?
- What happens if the patient attempts to screenshot or share a conversation (PHI leakage risk)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST support iOS 16+, Android 13+, and modern evergreen desktop
  browsers (Chrome, Safari, Edge, Firefox latest two versions) from a single codebase;
  each deployment target is released independently but shares business logic,
  UI components, and state management.
- **FR-002**: The app MUST implement end-to-end secure communication: all API calls MUST
  use TLS 1.2+; no plaintext patient data is stored unencrypted on device.
- **FR-003**: Patient authentication MUST use platform-issued short-lived access tokens
  renewed via a secure refresh flow across all targets. On mobile, biometric
  unlock (Face ID / fingerprint) MUST be supported as a convenience option using
  platform-native APIs; on web, the biometric layer is omitted and the patient falls back to
  password or PIN. Refresh tokens on web MUST be stored in `HttpOnly` cookies; on mobile
  they MUST be stored in the platform secure enclave / keystore.
- **FR-004**: The app MUST render a chat thread with visual differentiation between patient
  messages, AI agent responses, and clinician messages.
- **FR-005**: The app MUST support optimistic message sending: messages appear in the thread
  immediately on send and are marked with a pending indicator until server confirmation.
- **FR-006**: The app MUST implement offline message queuing: messages composed offline
  are queued and sent when connectivity is restored, with no duplication.
- **FR-007**: The app MUST display a typing indicator while an AI or clinician response is
  being composed.
- **FR-008**: The app MUST deliver push notifications for new messages on mobile; tapping a notification MUST deep-link to the relevant chat thread.
  On the web target, the app MUST request browser push notification permission and deliver notifications
  where the browser supports it.
  When browser push is unavailable or permission is denied, the app MUST gracefully degrade
  to an in-app unread badge and indicator — no hard error or blocked flow.
- **FR-009**: The push notification payload MUST NOT contain message content or PHI;
  notification text MUST use generic copy (e.g., "You have a new message from your care
  team").
- **FR-011**: Raw device push tokens and browser push subscriptions are
  PHI/PII and MUST be stored exclusively in the Devices service, encrypted at rest.
  All other services (chat, session, notification dispatch) MUST reference devices only
  by an internal opaque device UUID. The push service is the sole component permitted
  to resolve a device UUID to its raw token at send time. Device tokens MUST NOT appear
  in application logs, error traces, or any other service's data store.

### Key Entities

Apps do not own entities. Canonical entity definitions live in the services that store and manage them:

- **ChatThread / ChatMessage** → **001 Chat Service** (`ChatInteraction`, `Message`)
- **PatientAccount** → **012 Patient Service** (`Patient Record`)
- **DeviceSession / DeviceRegistration** → **013 Devices Service**
- **UserSession / RefreshTokenRecord** → **014 Auth Service**

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of messages sent from the app appear in the server-side chat service
  within 2 seconds under normal network conditions.
- **SC-002**: Push notifications are delivered within 30 seconds for 95% of new messages
  when the app is backgrounded.
- **SC-003**: Zero PHI values appear in push notification payloads, verified by automated
  payload inspection tests.
- **SC-004**: The app passes automated accessibility audits for VoiceOver and TalkBack on
  the primary chat screen.
- **SC-005**: Offline message queue delivers all queued messages in order within 5 seconds
  of reconnection, with no duplicates.

## Assumptions

- The app communicates with a single internal platform API gateway; it does not talk
  directly to the chat service, AI agent service, or any other backend service.
- Authentication tokens are issued by the Authentication Service (`014-authentication-service`).
- Push notification infrastructure (provider credentials and certificates) is managed by the
  platform team; the app only registers device tokens and receives notifications.
- The app targets iOS, Android, and web from a single codebase. Platform-native APIs
  (device push notifications, screen security flags, biometric) are accessed via
  platform channels or first-party packages; web equivalents are used on the
  web target (browser push for notifications, no screen-capture restriction equivalent).
- Feature 008 covers the clinician-facing app; the two apps share no screens but may
  share a common package for design tokens and API client code.
- Accessibility compliance target is WCAG 2.1 AA.
- Mobile platform distribution store submission and review processes are operational concerns outside
  this spec. Web app hosting and CDN configuration are also out of scope.

