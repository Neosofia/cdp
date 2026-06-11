# Care Episode Service

## Why we need this service

Post-discharge care is procedure-scoped. A patient who had surgery in April and another in July is the same person on the platform, but their chats, alerts, and clinical context for each procedure must stay separate. Without a bounded grouping object, no service can reliably answer: *which conversations and EMR context belong to this procedure versus that one?*

The Care Episode Service exists so the platform has **one authoritative place** to record that grouping -- patient, procedure reference, care window, status, and invite linkage -- and to expose lookups other services depend on. It is the root object for clinician invites, patient onboarding, chat association, and lifecycle events that downstream pipelines consume.

## How this service fits into the platform

A clinician does not “create an episode” as a separate step from inviting a patient. Inviting a patient for post-care monitoring for a given procedure **is** episode creation: the service atomically opens an active care episode anchored to the patient and EMR procedure reference and returns an invite token encoding the episode identifier. When the patient completes registration with that token, the patient service confirms association and the episode links unambiguously to the correct person.

The Chat Service depends on this service for a patient’s active episode before opening a new conversation — every message must belong to an open care window. When multiple episodes overlap, the most recently opened active episode wins until multi-episode selection is productised. Episodes close automatically when the care window expires (scheduled job) or explicitly when a clinician or admin closes them; closure emits lifecycle events with identifiers only so subscribers can react without PHI in the bus payload.

**Initial version:** when a patient starts a new chat ([FR-015](https://github.com/Neosofia/cdp/blob/main/specs/015-care-episode-service.md)), the platform confirms an active episode, attaches authoritative episode context to the conversation, and returns what the client needs to continue messaging — without the client performing episode lookup, context assembly, and conversation creation as separate steps. That context supports the care assistant on each patient turn, including clinical risk evaluation ([001](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md) FR-011, [010](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)).

Authentication and coarse authorization are enforced upstream; this service trusts validated platform tokens and applies care-episode-specific access rules before mutating or returning records.

## Client objectives

**Clinicians** want a single invite action that starts post-discharge monitoring for a procedure -- not a multi-step provisioning workflow. They need to see episode history for a patient, understand which windows are still open, and close an episode early when care ends before expiry.

**Patients** enter the platform through an invite tied to one procedure. Registration must land them in the correct episode immediately; expired or closed invites must fail clearly.

**The Chat Service and other downstream consumers** need a fast, reliable active-episode lookup on the critical path for every inbound message, plus list and detail views for clinician experiences defined elsewhere.

**Operators and compliance reviewers** need lifecycle events when episodes open and close, full-row audit history on mutable state, and confidence that bus payloads carry correlators only -- not clinical narrative.

## Functional requirements

- **FR-001**: An authenticated invite request specifying patient identifier, EMR procedure reference, care window duration, and procedure type atomically creates a care episode in `active` status and returns the episode identifier and invite token in one response. The invite is the sole entry point for patient onboarding tied to that procedure.

- **FR-002**: When an active care episode already exists for the same patient and EMR procedure reference, a new invite is rejected and the existing episode identifier is returned so clinicians are not duplicated into parallel windows for the same procedure.

- **FR-003**: When no care window duration is supplied, a tenant-configurable default applies (30 days for the default procedure type unless overridden).

- **FR-004**: An active-episode lookup returns the single active care episode for a given patient. When several are active, the most recently opened is returned. When none are active, the response indicates not-found -- an exceptional state meaning all care windows have closed.

- **FR-005**: An episode list returns all care episodes for a patient in reverse chronological order, including closed episodes, with procedure reference, care window, and status. Clinician UI presentation is owned by the clinician app spec.

- **FR-006**: Episode detail by identifier returns the full episode record for authorized callers. Presentation belongs in the clinician app spec.

- **FR-007**: Care episodes whose care window expiry timestamp has passed are transitioned to `closed` automatically by a scheduled job running at least daily, with closure reason `care-window-expired`.

- **FR-008**: An authenticated clinician can manually close an active episode before expiry; closure reason is `clinician-closed` and the closing actor is recorded.

- **FR-009**: An authenticated admin can close an active episode; closure reason is `admin-closed` and the closing actor is recorded.

- **FR-010**: Care window extension by clinicians is out of scope for the initial version; no endpoint or UI is provided until explicitly specced.

- **FR-011**: On creation the service emits a `care_episode.opened` event; on closure (any reason) it emits `care_episode.closed`. Event payloads contain episode identifier, patient identifier (UUID), procedure type, closure reason, and timestamps -- not message content or other PHI.

- **FR-012**: After successful patient registration, the patient service confirms patient-to-episode association via a dedicated endpoint. The episode record links the patient identifier and the invite is marked consumed. Registration against a closed or expired episode is rejected.

- **FR-013**: Unauthenticated or unauthorized requests are rejected before business logic runs.

- **FR-014**: Every create, close, and association mutation appends full-row audit history. Compliance review needs who changed what, not merely that a row changed.

- **FR-015**: When a patient begins a new chat, the platform ensures an active care episode exists ([FR-004](https://github.com/Neosofia/cdp/blob/main/specs/015-care-episode-service.md)), attaches authoritative episode and session context to that conversation, and returns what the client needs to continue messaging — without the client orchestrating those steps separately. Episode context remains available for the care assistant on each subsequent patient turn, including clinical risk evaluation ([001](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md) FR-011, [010](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)).

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** invite volume, lookup latency, and closure processing. At minimum:

  - Classifying request outcomes and errors by endpoint
  - Attributing request duration for active-episode lookup (chat critical path)
  - Counting episodes opened and closed by reason

- **OR-002**: Lifecycle events are emitted promptly after the triggering mutation so downstream subscribers (chat, notifications, analytics) can rely on the bus without polling episode state.

- **OR-003**: The scheduled closure job is observable: operators can confirm episodes past expiry were closed and that already-closed rows were skipped idempotently.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Clinician app (episode presentation): [008-clinician-app.md](https://github.com/Neosofia/cdp/blob/main/specs/008-clinician-app.md)
- Chat service spec: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- Authorization service spec: [016-authorization-service.md](https://github.com/Neosofia/cdp/blob/main/specs/016-authorization-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Audit infrastructure: [017-audit-infrastructure.md](https://github.com/Neosofia/cdp/blob/main/specs/017-audit-infrastructure.md)
