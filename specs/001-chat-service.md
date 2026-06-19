# Chat Service

## Why we need this service

Patients and clinicians converse through the CDP web application. Every message may carry clinical context, personal details, and the wording a patient chose in the moment. That content is the authoritative record of what was said, who said it, and when; it must survive reliably before clinician review or compliance audit runs elsewhere.

Without a dedicated conversation store, messages would be persisted inconsistently and the platform would have no trustworthy source to read from. The Chat Service exists so the platform has **one durable, complete storage and retrieval layer** for conversation threads — while leaving care-window orchestration, clinical risk evaluation, care-assistant replies, and escalation alerts to the services that own those concerns.

## Scope

This service is the **authoritative message store** for conversation threads tied to a person on the platform. It stores inbound and outbound turns, serves thread list and message history to authorised callers, and runs care-assistant inference when an authorised orchestrator requests completions.

It does not decide clinical severity, send alert email, validate care windows, or inject recovery context — those concerns belong to services that own them ([015-care-episode-service.md](015-care-episode-service.md), [010-ai-agent-service.md](010-ai-agent-service.md)). Access rules are enforced before any message is returned or accepted.

Which clients call this service directly vs through an orchestrator is documented in [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md).

## Client objectives

**Patients** want their words captured faithfully and their conversation history available in the CDP web application without seeing other patients' threads.

**Clinicians** need to read and send messages for patients enrolled at their site when reviewing care or joining a thread as the care team — without seeing conversation data from other organisations.

**The Care Episode Service** needs a dependable store to open threads, append messages, list history, and reflect when a clinician has joined so automated replies pause appropriately.

**Platform operators** need to measure storage health and access patterns without ever logging message content or other identifying clinical narrative.

## Workflows

**Store a patient turn (happy path).** Given an authorised orchestrated request to append a patient message to an open thread, when the payload is valid and the caller is permitted, then the message is stored with direction, timestamp, and thread membership, and the caller receives confirmation without partial writes.

**Clinician joins a thread.** Given a clinician authorised for the patient’s site sends a message in a thread where automated replies were active, when the message is accepted, then subsequent automated care-assistant replies for that thread remain paused until product policy resumes them, and the patient sees that the care team is present.

## Functional requirements

- **FR-001**: The service stores conversation threads scoped to a platform user. A person may have multiple threads over time. Longer-lived recovery context is supplied when a thread is opened by an authorised orchestrator and retained with that thread — not re-entered by the patient client on every message.

- **FR-002**: Every message is persisted with its full, unmodified content, thread membership, direction, and timestamp. This layer deliberately performs no redaction; it is the authoritative clinical conversation record.

- **FR-003**: A new thread opens only when an authorised orchestrator requests one with validated clinical context. Patients do not open threads by calling this service directly from the browser.

- **FR-004**: Outbound messages — from the care assistant or a clinician — are stored in the same thread as inbound messages so the record is complete.

- **FR-005**: When a clinician joins a thread, automated care-assistant replies for that thread pause until product policy explicitly resumes them. Thread state reflects care-team presence for the patient experience.

- **FR-006**: Access is enforced before business logic runs. Patients may read and send only in their own threads. Clinicians may read and send for patients at their site. Authorised orchestrators may write on behalf of coordinated flows. One organisation’s conversations are never visible to identities scoped to another.

- **FR-007**: Duplicate submissions, empty payloads, and oversize messages are rejected with clear errors and no partial side effects.

- **FR-008**: Stored categorical values expose human-readable labels for operators and clients through the service’s published contract, so UI and reports do not depend on private numeric codes alone.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** message volume for the product engagement dashboard ([011-operational-metrics.md](011-operational-metrics.md)). At minimum:

  - Counting inbound patient messages and clinician messages stored (by direction, no content)
  - Counting threads opened

  Request latency and error rate are measured on the **DORA** dashboard.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Care Episode Service: [015-care-episode-service.md](015-care-episode-service.md)
- Clinical risk evaluation: [010-ai-agent-service.md](010-ai-agent-service.md)
- CDP web application: [019-cdp-web-application.md](019-cdp-web-application.md)
- Care Episode orchestration ADR: [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md)
- Integer enum labels ADR: [0003-store-categorical-columns-as-integer-enums.md](../architecture/adrs/0003-store-categorical-columns-as-integer-enums.md)
- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
- API contract: [openapi.json](https://github.com/Neosofia/chat/blob/main/openapi.json)
