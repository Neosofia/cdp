# Chat Service

## Why we need this service

Patients reach the platform through more than one channel -- mobile app, web browser, and SMS -- and they expect a continuous conversation, not a fragmented log scattered across adapters. Every inbound message may carry clinical context, personal details, and the raw wording a patient chose in the moment. That content is the authoritative record of what was said, who said it, and when; it must survive reliably before any deidentification, AI analysis, or clinician review runs elsewhere.

Without a dedicated raw chat store, channel adapters would each persist messages differently, care episodes would drift from conversation windows, and downstream pipelines would have no trustworthy source to read from. The Chat Service exists so the platform has **one durable, PHI-complete ingestion and retrieval layer** for patient-facing chat -- while leaving deidentification, clean analytics stores, care-episode lifecycle, and channel-specific protocols to the services that own those concerns.

## How this service fits into the platform

The Chat Service sits at the boundary between patient channels and the rest of the clinical mesh. Channel adapters (SMS gateway, web, app) call a unified internal ingestion API; the service validates identity, ties each conversation to an active care episode, persists the full unredacted message, invokes the AI Response agent for real-time replies, and publishes lifecycle events for downstream processing. **Channel delivery** -- carrier receipts, push dispatch, optimistic send state, offline queues, and device-level `delivered` / `failed` tracking -- stays in each adapter ([007-patient-chat-app.md](https://github.com/Neosofia/cdp/blob/main/specs/007-patient-chat-app.md), [009-sms-service.md](https://github.com/Neosofia/cdp/blob/main/specs/009-sms-service.md)); this service acknowledges successful ingestion and persistence only. **Care episodes** -- the longer-lived clinical context for a patient -- are owned by the Care Episode Service; this service holds foreign keys and refuses to open a new chat interaction when no active episode exists.

When a **chat interaction** ends -- because the patient closes it after feedback or because of inactivity -- the service will publish a session-end event (identifiers only, no message body) so the deidentification pipeline can fetch the full log and produce a clean copy for employee and ML workloads. **Initial version:** interaction close, end events, and that downstream path are deferred (see FR-004); raw chat uses open-ended interactions until the de-ident bundle ships. Authentication and coarse authorization are enforced upstream; this service trusts validated platform tokens and applies chat-specific access rules before returning stored content. Encryption, HIPAA BAAs, and infrastructure provisioning are platform concerns, not duplicated here.

## Client objectives

**Patients** want to send a message on whichever channel they use and receive a helpful reply without thinking about sessions, storage, or retries. Their words should be captured faithfully and answered in real time until the conversation naturally ends.

**Clinicians and operators** need to read the full message history for patients within their authorised scope when reviewing care or investigating an interaction -- without seeing data from other tenants or regions they are not permitted to access.

**Channel adapters** need a single, dependable write path that accepts inbound traffic, enforces rate limits fairly, and returns clear errors when an episode is missing or a message cannot be accepted.

**Downstream pipelines and agents** need durable raw logs and timely interaction-end signals so deidentification and real-time AI workloads can run against authoritative content without re-implementing chat storage.

**Platform operators** need to measure ingestion health, streaming behaviour, and access patterns without ever logging raw message content or other PHI.

## Functional requirements

- **FR-001**: The service accepts inbound messages from all supported channels (mobile app, web browser, SMS gateway) through a unified internal API so channel adapters share one ingestion contract rather than bespoke storage per channel.

- **FR-002**: Every message is persisted with its full, unmodified content, channel source, patient identifier, chat interaction identifier, unique message identifier, direction, and UTC timestamp -- this layer is the authoritative PHI-complete audit trail and deliberately performs no redaction.

- **FR-003**: The service distinguishes two session concepts: a **chat interaction** (a short-lived conversation window within a care episode) and a **care episode** (owned elsewhere). A new interaction is opened on first message in a window, linked to the patient's active care episode; if no active episode exists, the message is rejected and no interaction is created.

- **FR-004**: A chat interaction ends when the patient explicitly closes via the post-chat feedback window or after fifteen minutes of inactivity. End reason (`user-closed` or `inactivity-timeout`) is recorded, and an interaction-end event is published containing only interaction id, care episode id, patient id, tenant id, and end reason -- no message content -- so the deidentification pipeline can fetch the full log from storage. **Initial version:** deferred together with the deidentification pipeline ([002](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md)) and clean chat store ([003](https://github.com/Neosofia/cdp/blob/main/specs/003-clean-chat-service.md)); no close API, inactivity timeout, or interaction-end events until that bundle ships.

- **FR-005**: Outbound messages (AI or clinician replies) are stored alongside inbound messages in the same interaction with direction indicated, preserving a complete conversational record.

- **FR-006**: For every inbound patient message, the service invokes the real-time care assistant and delivers the reply back to the patient's active channel; the complete response is persisted as an outbound message once the turn completes. Token streaming to the channel is desirable but not required for the initial version.

- **FR-007**: Access is enforced by role and tenant: only authenticated identities with clinician or operator privileges may read stored messages for patients within their authorised geographic scope; only authorised channel adapters may write messages; data from one organisation is never visible to identities scoped to another.

- **FR-008**: A configurable per-patient rate limit applies to inbound messages (default one message per second). When exceeded, the service returns HTTP 429, does not store the message, and does not publish downstream events -- protecting the mesh from abuse without silently dropping accepted traffic.

- **FR-009**: Duplicate submissions, empty or whitespace-only payloads, and oversize messages are handled deterministically: duplicates do not create duplicate records; invalid payloads are rejected with clear errors without partial side effects.

- **FR-010**: Structured lifecycle events are emitted on the **downstream event bus** for significant state changes so async pipelines can react without polling chat storage. Events never contain raw message content or PHI. **Initial version:** deferred with FR-004 and the deidentification bundle ([002](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md), [003](https://github.com/Neosofia/cdp/blob/main/specs/003-clean-chat-service.md)); operator dashboards use OR-001 request telemetry instead of this bus catalogue in v1.

- **FR-011**: For every inbound patient message, the care assistant performs **synchronous clinical risk evaluation** in the same turn as the conversational reply, producing a binary intervention signal per [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md). Evaluation uses interaction context (including the care-episode snapshot from bootstrap — [015](https://github.com/Neosofia/cdp/blob/main/specs/015-care-episode-service.md) FR-015) and full thread history. When the outcome is yes, the service triggers the Notification Service escalation path within the platform time budget. A risk evaluation record is stored for every message (model version, binary outcome, correlators — not message text). **Initial version:** sync in the completions path; a separate async risk microservice is deferred until scale requires it ([010](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md) future path).

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Operators can build dashboards from **structured request telemetry** (platform baseline OR-002) — not a bespoke catalogue of named chat domain events. At minimum, aggregators can derive:

  - Request volume and latency by route and HTTP status (for example `POST /api/v1/messages`, `POST /api/v1/messages/completions`, `POST /api/v1/interactions`)
  - Error rates by endpoint (`4xx` / `5xx`, including `429` rate-limit and `403` authorization outcomes when emitted by platform middleware)
  - Inbound message and completion throughput from write-endpoint counts; interaction opens from `POST /api/v1/interactions`

  Tenant and channel breakdown use correlators present in telemetry (for example trace id, optional tenant claim fields on access or security log lines) or platform DB aggregates — not message body or PHI. See the platform operational metrics spec for the authoritative measurement model.

- **OR-002**: Peak throughput and latency targets for storage and AI completion turns are sized from platform capacity planning; this service exposes the telemetry operators need to verify behaviour under load without embedding numeric SLOs here.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Care Episode Service: [015-care-episode-service.md](https://github.com/Neosofia/cdp/blob/main/specs/015-care-episode-service.md)
- Deidentification pipeline: [002-deidentification-pipeline.md](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md)
- Clinical risk evaluation: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
