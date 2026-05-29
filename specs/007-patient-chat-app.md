# Patient Chat App

## Why we need this app

Post-discharge patients need a familiar, always-available way to ask about symptoms, medications, and recovery -- without waiting on phone queues or guessing whether a message reached their care team. SMS and web reach some people; a dedicated cross-platform app is the primary high-engagement channel for patients who want a continuous conversation with AI-assisted support and, when needed, a human clinician in the same thread.

The Patient Chat App exists to deliver that experience on iOS, Android, and web from a single codebase. It handles secure onboarding, authenticated chat UX, optimistic sending, offline resilience, and push re-engagement. AI personality, clinical reasoning, risk detection, and escalation logic live in backend services; this app renders the conversation and respects platform security boundaries for tokens, device registration, and notification content.

## How this app fits into the platform

Patients reach the platform through a single API gateway -- not individual backend services. After invitation and identity verification, the Authentication Service issues short-lived access tokens; the Patient Service links the account to the EMR record. Chat messages flow through the gateway to the Chat Service, which stores interactions and streams AI replies from the inference layer. When a clinician takes over after escalation, messages from both AI and clinician appear in the same thread with clear visual distinction.

Push notifications for new replies are dispatched through platform notification infrastructure. Raw device push tokens and browser push subscriptions are stored only in the Devices Service, encrypted at rest; other services reference devices by opaque internal identifiers. Notification payloads use generic copy only -- no message body or PHI -- so lock-screen previews stay safe.

The clinician-facing portal (escalation handling, record review, session takeover) is a separate application specified independently. The two apps may share design tokens and API client code but do not share screens. Platform baseline (spec 000) applies to HTTPS transport, PHI-safe telemetry, and accessibility.

## Client objectives

**Newly discharged patients** want a simple path from invitation to first message: verify identity, land in an active chat, and know their account is tied to the right clinical record before any care conversation begins.

**Returning patients** want to open the app and resume their thread immediately -- biometric unlock on mobile, password or PIN on web -- without repeating onboarding.

**Patients messaging about symptoms** expect a responsive chat experience: messages appear instantly, typing indicators show while a reply is composed, and AI or clinician responses arrive in the same familiar thread.

**Patients who background the app** still need to know when their care team replies. Push notifications should deep-link to the correct thread; when notifications are disabled, unread state should be visible the next time they open the app.

**Platform security and compliance** require encrypted storage of refresh tokens (secure enclave on mobile, HttpOnly cookies on web), no PHI in push payloads, and device tokens confined to the Devices Service -- never logged or duplicated across services.

## Functional requirements

- **FR-001**: The app ships iOS, Android, and web from a single codebase. Each deployment target releases independently but shares business logic, UI components, and state management.

- **FR-002**: No plaintext patient data is stored unencrypted on device.

- **FR-003**: Patient authentication uses platform-issued short-lived access tokens renewed through a secure refresh flow on all targets. Mobile supports biometric unlock (Face ID, fingerprint) as a convenience via platform-native APIs. Web omits biometric unlock and falls back to password or PIN. Refresh tokens on web are stored in HttpOnly cookies; on mobile they are stored in the platform secure enclave or keystore.

- **FR-004**: Onboarding begins from an invitation link (SMS or email). The patient completes identity verification; on success the app account is created, linked to the EMR patient id, and the patient is taken to an active chat session. After three failed verification attempts the account locks for one minute, then the patient may self-service resend the invitation and restart onboarding with a new password -- no admin intervention for a standard lockout.

- **FR-005**: Returning patients authenticate and are taken directly to their active chat thread without repeating onboarding.

- **FR-006**: The app renders a chat thread with visual differentiation among patient messages, AI agent responses, and clinician messages. When a clinician takes over following escalation, clinician replies appear in the same thread with a distinct visual treatment.

- **FR-007**: The app supports optimistic message sending: messages appear in the thread immediately on send and show a pending indicator until the server confirms delivery.

- **FR-008**: Offline message queuing holds composed messages when connectivity is lost and sends them in order when connectivity returns, without duplication.

- **FR-009**: A typing indicator displays while an AI or clinician response is being composed.

- **FR-010**: Mobile delivers push notifications for new messages; tapping a notification deep-links to the relevant chat thread. The web target requests browser push permission and delivers notifications where supported. When browser push is unavailable or permission is denied, the app degrades gracefully to an in-app unread badge and indicator -- no hard error or blocked flow.

- **FR-011**: Push notification payloads contain no message content or PHI. Notification text uses generic copy (for example, "You have a new message from your care team").

- **FR-012**: Raw device push tokens and browser push subscriptions are stored exclusively in the Devices Service, encrypted at rest. Chat, session, and notification dispatch services reference devices only by an internal opaque device UUID. The push dispatch path is the sole component permitted to resolve a device UUID to its raw token at send time. Device tokens do not appear in application logs, error traces, or any other service's data store.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Events support **measuring** message send confirmation latency, push delivery timing, offline queue drain behaviour, and authentication failures.

- **OR-002**: Push notification provider credentials and certificates are managed by the platform team. The app registers devices and receives notifications; it does not embed provider secrets.

- **OR-003**: Mobile store submission, review processes, web hosting, and CDN configuration are operational concerns outside this spec. AI agent personality, prompt configuration, and escalation logic are specified in backend service specs, not here.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Chat service spec: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Patient service spec: [012-patient-service.md](https://github.com/Neosofia/cdp/blob/main/specs/012-patient-service.md)
- Devices service spec: [013-devices-service.md](https://github.com/Neosofia/cdp/blob/main/specs/013-devices-service.md)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- AI risk agent service spec: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Clinician app spec: [008-clinician-app.md](https://github.com/Neosofia/cdp/blob/main/specs/008-clinician-app.md)
