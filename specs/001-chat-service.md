# Feature Specification: Chat Service

**Feature Branch**: `001-chat-service`
**Created**: 2026-04-17
**Status**: Draft
**Input**: Raw, unredacted chat interaction storage across all patient-facing channels (SMS, web, app)

## User Scenarios & Testing

### User Story 1 — Patient Starts a Chat and Sends a Message (Priority: P1)

An authenticated patient opens the chat on any supported channel (app, web, or SMS). The
service identifies them, opens a new ChatInteraction tied to their active CareEpisode, and
accepts their first message. Subsequent messages continue within the same interaction until
it ends.

**Why this priority**: This is the foundational ingestion path. No other service works without
reliable, durable message receipt. Authentication and session initialisation are prerequisites
to any message being accepted.

**Independent Test**: A test client authenticates as a patient, sends a message via the REST
ingestion API, and verifies the message is stored with correct channel, ChatInteraction,
CareEpisode, and patient identifiers; and that a downstream event has been published.

**Acceptance Scenarios**:

1. **Given** an authenticated patient opens the chat for the first time in a new interaction
   window, **When** their first message arrives, **Then** a new ChatInteraction is created,
   linked to their active CareEpisode, and the message is stored and associated with it.
2. **Given** a patient sends a chat message via any supported channel, **When** the service
   receives it, **Then** the message is stored durably, assigned a unique message ID, and an
   event is published to the downstream processing queue within 500 ms.
3. **Given** the AI agent generates a response, **When** the first response token is available,
   **Then** the service begins streaming the response back to the patient's channel in real
   time; the complete response is stored as an outbound message once streaming is complete.
4. **Given** a message arrives with a valid patient identity but no active CareEpisode,
   **When** the service processes it, **Then** the message is rejected with a clear error
   and no ChatInteraction is created.
5. **Given** the downstream queue is temporarily unavailable, **When** the service receives
   a message, **Then** the message is still durably stored, and the event is retried with
   exponential backoff until the queue accepts it.

---

### User Story 2 — Message Delivery Status Tracking (Priority: P2)

The platform can determine whether a message sent from the system (AI or clinician reply)
has been delivered to the patient, to support escalation logic and re-delivery.

**Why this priority**: Delivery tracking is important for escalation reliability but is
lower priority than core ingestion and read paths.

**Independent Test**: Send a reply message, confirm delivery status transitions from
`pending` → `sent` → `delivered` (or `failed`), with each state change timestamped.

**Acceptance Scenarios**:

1. **Given** an outbound message is created, **When** the downstream channel confirms delivery,
   **Then** the status transitions to `delivered` and the timestamp is recorded.
2. **Given** delivery fails after maximum retries, **When** the final retry fails,
   **Then** status transitions to `failed` and an alert is raised to the notification service.

---

### Edge Cases

- What happens when a patient sends messages faster than the rate limit allows?
- How does the service handle extremely large message payloads (e.g., a patient pastes a wall of text)?
- What happens if the patient sends an empty or whitespace-only message?
- How does the service handle duplicate message submissions (e.g., offline retry that fires twice)?
- What happens when storage is at capacity or degrades?

## Requirements

### Functional Requirements

- **FR-001**: The service MUST accept inbound messages from all supported channels (mobile app,
  web browser, SMS gateway) via a unified internal API.
- **FR-002**: Every message MUST be persisted with its full, unmodified content (no PHI
  stripping at this layer), channel source, patient identifier, session identifier,
  unique message ID, and UTC timestamp.
- **FR-003**: When a chat interaction ends (triggered by a patient explicitly closing via
  the post-chat feedback window, or by a 15-minute inactivity timeout), the service MUST
  publish an "end chat interaction" event to the deidentification pipeline queue. The event
  payload MUST contain only the interaction ID, care episode ID, patient ID, tenant ID, and
  end reason (`user-closed` / `inactivity-timeout`) — no message content. The downstream
  consumer fetches the full message log from storage. The event MUST be published within
  500 ms of the interaction end trigger.
- **FR-004**: The service MUST enforce RBAC: only authenticated identities with the
  `clinician` or `admin` role may read stored messages for any patient within their
  geographic region (US-wide regional pool — clinicians are not pre-assigned to specific
  patients); only authorised channel adapters may write messages.
- **FR-005**: The service MUST support multi-tenant isolation: messages from patients of one
  organisation MUST NOT be accessible to identities scoped to a different organisation.
- **FR-006**: The service MUST support two distinct session concepts:
  - **Chat Interaction**: A short-lived conversation window within a care episode. Ends
    automatically after 15 minutes of inactivity, or when the patient explicitly closes
    via the post-chat feedback window. Ending an interaction triggers deidentification.
    End reason MUST be recorded (`user-closed` / `inactivity-timeout`).
  - **Care Episode**: Owned by the **Care Episode Service** (`015-care-episode-service`). The chat service holds a `care_episode_id` foreign key on every `ChatInteraction` and `Message`, but does not manage episode lifecycle. The chat service MUST call the Care Episode Service active-episode lookup before opening a new interaction. If no active episode exists for the patient, the message MUST be rejected.
- **FR-007**: Outbound messages (AI or clinician replies) MUST be stored alongside inbound
  messages in the same session with direction (`inbound`/`outbound`) indicated.
- **FR-008**: The service MUST invoke the AI Response agent for every inbound patient message
  and stream the response back to the patient's active channel in real time using server-sent
  events or WebSocket. Streaming MUST begin within 2 seconds of the inbound message being
  stored. The complete response MUST be persisted as an outbound `Message` record once the
  stream is finished.
- **FR-008**: The service MUST expose a message delivery status API allowing callers to track
  the lifecycle of outbound messages (`pending` → `streaming` → `sent` → `delivered` / `failed`).
- **FR-009**: The service MUST enforce a configurable per-patient rate limit on inbound messages (default: 1 message per second). When a message exceeds the rate limit, the service MUST return HTTP 429 to the calling channel adapter; the message MUST NOT be stored and no downstream event MUST be published.
- **FR-010**: The service MUST emit structured lifecycle events to the platform log aggregator for every significant state change: message received, message stored, AI response stream started, AI response stream completed, interaction started, interaction ended, care episode opened, care episode closed, rate-limit rejection, and access-denied. Events **MUST NOT contain raw message content or any PHI**.

### Key Entities

- **PatientIdentity**: Unique ID, tenant ID, EMR patient reference, registration timestamp, status (`active` / `deactivated`), channel-specific contact identifiers (phone number for SMS, device token for app, browser session for web), invitation token reference (single-use, invalidated on registration).
- **Message**: Unique ID, chat interaction ID, care episode ID, patient ID, tenant ID,
  channel (`app` / `web` / `sms`), direction (`inbound` / `outbound`), content (full
  unredacted text), sender identity, timestamp, delivery status (`pending` / `streaming` / `sent` / `delivered` / `failed`).
- **ChatInteraction**: Unique ID, care episode ID (FK → Care Episode Service), patient ID, tenant ID, started timestamp,
  last activity timestamp, status (`active` / `ended`), end reason
  (`user-closed` / `inactivity-timeout`), ended timestamp.
- **CareEpisode**: Owned by **015 Care Episode Service**; referenced here by `care_episode_id` only. Consult `015-care-episode-service.md` for the canonical schema.
- **AuditEvent**: Event ID, actor identity, patient ID, operation type, resource ID,
  timestamp, outcome.
- **ConsentRequest**: Request ID, chat session UUID, patient UUID, clinician ID, status
  (`pending` / `accepted` / `declined`), created timestamp, responded timestamp.
- **SessionReview**: Review ID, chat session UUID, clinician ID, rating (`thumbs_up` /
  `thumbs_down`), comment (optional free text), created timestamp, updated timestamp.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 99.9% of inbound messages are durably stored within 500 ms of receipt under
  normal load.
- **SC-002**: Downstream queue events are published within 500 ms of message storage for
  99.9% of messages.
- **SC-003**: The service MUST sustain a combined peak ingestion throughput of **30 messages/second
  (1,800 msg/min)** across all channels (app, web, SMS) with p99 storage latency ≤500 ms.
  Derived from the Erlang C model in spec 009 (SMS = 10% of traffic, sized for 3 msg/sec
  with 30% headroom already applied → full channel total = 3 ÷ 0.10 = 30 msg/sec).
- **SC-004**: AI response streaming begins within 2 seconds of inbound message storage for 99th percentile of requests under normal load.
- **SC-005**: Multi-tenant isolation is verifiable: automated tests confirm zero cross-tenant
  data leakage across 100% of test cases.
- **SC-006**: Message history retrieval for any session returns results in under 1 second for
  sessions up to 1,000 messages.

## Assumptions

- All data in this service is treated as potentially containing PHI; no redaction is performed at this layer.
- The stored chat log (all messages with sender identity and timestamps) is the authoritative audit trail of a patient's interaction with the platform. No separate PHI audit log is required for patient self-access.
- Per-message AI agents (AI Response, AI Alert) MAY receive raw message content. This is permitted under Constitution Principle I provided the AI provider operates under a HIPAA BAA.
- Database and messaging queue infrastructure is pre-provisioned.
- Authentication and authorisation are enforced by an upstream API Gateway before any request reaches this service. The chat service trusts validated identity tokens from the gateway and does not perform authentication itself.
- Channel adapters (SMS, web, app) are separate services that call this service's ingestion API; channel-specific protocol handling is out of scope here.
- Encryption at rest (AES-256) and in transit (TLS 1.2+) is enforced at the infrastructure layer.
- A HIPAA BAA is in place with all storage and messaging infrastructure providers.
