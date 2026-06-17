# Care Episode Service

## Why we need this service

Post-discharge care is procedure-scoped. A patient who had surgery in April and another in July is the same person on the platform, but their chats, alerts, and clinical context for each procedure must stay separate. Without a bounded care window, no service can reliably answer: *which conversations belong to this procedure versus that one?*

The Care Episode Service exists so the platform has **one authoritative place** to record procedure-scoped recoveries, attach clinical context, run the patient chat path, evaluate risk on each turn, and trigger escalation when required.

## How this service fits into the platform

Inviting a patient for post-care monitoring opens an active recovery anchored to that patient and procedure. The User registry ([018-user-service.md](018-user-service.md)) holds who the person is and which org roles they hold; this service owns recovery lifecycle, records shown beside chat in clinician views, and the **clinical front door** the CDP web application uses for patient chat.

The CDP web application does not coordinate chat, risk, and alerts itself. For patient chat it calls this service to confirm an open recovery, open or continue a thread with authoritative context, receive the care-assistant reply, and learn the risk outcome for that turn. This service persists messages through the Chat Service ([001-chat-service.md](001-chat-service.md)), evaluates clinical risk ([010-ai-agent-service.md](010-ai-agent-service.md)), and requests alert email when severity and policy require it ([005-notification-service.md](005-notification-service.md)).

Recoveries close when the care window expires or when authorised staff close them early. Lifecycle notifications carry identifiers only — not clinical narrative.

## Client objectives

**Clinicians** want one invite action that starts post-discharge monitoring for a procedure. They need recovery history, roster severity, and the ability to close a recovery early when care ends before expiry.

**Patients** enter through an invite or guided demo experience tied to a recovery. Registration must land them in the correct care window; expired or closed invites must fail clearly.

**The CDP web application** needs a single orchestration surface for patient chat and clinician recovery views without composing multiple backend calls in the browser.

**Operators and compliance reviewers** need lifecycle signals, audit history on changes, and confidence that logs and events carry correlators only.

## Workflows

**Patient sends a chat message (happy path).** Given a signed-in patient with an active recovery opens or continues a thread in the CDP web application, when they send a message, then this service ensures the recovery is valid, completes the care-assistant reply for that turn, stores the conversation, evaluates risk, returns the reply and severity outcome to the client, and requests alert delivery when severity is high and escalation is enabled.

**Invite opens monitoring.** Given an authorised clinician invites a patient for a named procedure, when no conflicting active recovery exists for that procedure, then a new recovery opens, an invite is issued, and audit history records who created it.

## Functional requirements

- **FR-001**: An authorised invite for a named procedure and patient opens a recovery in active status and returns what the patient needs to register or continue — in one action, not a multi-step provisioning desk workflow.

- **FR-002**: When an active recovery already exists for the same patient and procedure, a duplicate invite is rejected and the existing recovery is identified so parallel care windows do not open by mistake.

- **FR-003**: When no care-window length is supplied, a tenant-appropriate default applies unless tenant policy overrides it.

- **FR-004**: Lookup of the active recovery for a patient returns a single active window; when several overlap, the most recently opened wins; when none exist, the caller receives a clear not-found outcome.

- **FR-005**: A patient’s recovery history lists all windows newest-first, including closed ones, with procedure reference, window dates, status, and current severity for roster views.

- **FR-006**: Recovery detail for authorised callers includes the rolling clinical summary metadata clinicians need beside chat.

- **FR-007**: Recoveries past their end date close automatically on a daily schedule with reason recorded as window expired.

- **FR-008**: An authorised clinician may close an active recovery before its end date; the reason and actor are recorded.

- **FR-009**: An authorised operator may close an active recovery before its end date; the reason and actor are recorded.

- **FR-010**: Extending a care window is out of scope for v1 unless explicitly specced later.

- **FR-011**: Opening and closing a recovery emits lifecycle events whose payloads contain identifiers, procedure type, closure reason, and timestamps — not message content or other PHI.

- **FR-012**: After registration or demo onboarding completes, the recovery links to the patient’s platform identity and any one-time invite is marked consumed. Registration against a closed or expired recovery is rejected.

- **FR-013**: Unauthenticated or unauthorised requests are rejected before business logic runs.

- **FR-014**: Every create, close, and association change appends audit history suitable for compliance review.

- **FR-015**: When a patient chats through the CDP web application, this service performs the orchestration described in the patient chat workflow: valid recovery, thread with context, care-assistant reply, persisted conversation, risk evaluation, and client-visible outcomes.

- **FR-016**: When severity is high and escalation is enabled, this service requests clinical alert delivery within the configured time budget.

- **FR-017**: Medical record content shown beside chat in clinician views is stored and served by this service for authorised callers scoped to the recovery.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** invite volume, chat-path duration, evaluation outcomes, and closures. At minimum:

  - Classifying request outcomes and errors by operation
  - Attributing duration of chat turns
  - Counting recoveries opened and closed by reason
  - Counting escalations triggered by severity outcome

- **OR-002**: Lifecycle events follow the triggering change promptly.

- **OR-003**: Automatic closure of expired recoveries is observable and skips already-closed rows idempotently.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- CDP web application: [019-cdp-web-application.md](019-cdp-web-application.md)
- Chat service spec: [001-chat-service.md](001-chat-service.md)
- Clinical risk evaluation: [010-ai-agent-service.md](010-ai-agent-service.md)
- Notification service spec: [005-notification-service.md](005-notification-service.md)
- User service spec: [018-user-service.md](018-user-service.md)
- Care Episode orchestration ADR: [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md)
- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
