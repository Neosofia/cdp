# AI Risk Agent Service

## Why we need this service

Every inbound patient message may carry a clinical risk signal -- suicidal ideation, chest pain, medication error, or another situation where waiting for a routine reply is unsafe. The platform's chat experience must stay fast and conversational; risk evaluation cannot block the patient while a model runs. The AI Risk Agent Service exists to evaluate each patient message for clinical risk **asynchronously**, return a binary intervention signal, and trigger the alert workflow when the answer is yes -- without adding latency to the visible chat interaction.

This spec covers **Agent 3** in the v1 AI pipeline: the risk agent only. The AI Response Agent (streaming replies to the patient) lives in the Chat Service and client apps. The Deidentification Agent (session-end batch processing) is specified separately. Splitting these concerns keeps patient-facing latency independent from safety-critical background evaluation.

## How this service fits into the platform

When the Chat Service stores an inbound patient message, it publishes a fire-and-forget event to the risk agent queue. This service consumes those events, retrieves session context from the Chat Service, invokes a versioned approved risk model through the AI inference provider, and records a binary outcome for every message. If the outcome is yes, it calls the Notification Service within the platform's escalation time budget. The patient continues receiving streamed AI replies in parallel; queue lag here does not slow the chat path.

PHI may flow to the inference provider under a signed HIPAA BAA -- the same constitutional constraint as other AI workloads -- but raw message content, prompts, and model responses never appear in service logs or audit records. Cross-service correlation uses sanitised identifiers only. Failed evaluations after retries land in a human-review path with a queryable audit record; automatic escalation is not triggered on agent failure.

## Client objectives

**Patients in distress** need their messages evaluated quickly even when they cannot wait for a clinician to read the transcript -- without noticing any delay in the conversational reply they see on screen.

**Clinicians and on-call staff** need timely, deduplicated escalation alerts when the risk model says intervention is warranted, and a reliable audit trail showing which messages were evaluated, with what model version, and what binary outcome resulted.

**Clinical safety reviewers** need to reconstruct evaluation history per message and session, including failed evaluations routed for human review, without log dumps containing raw chat content.

**Platform operators** need to detect when the risk agent stops processing, falls behind, or errors at scale -- queue lag and error rate are primary patient-safety signals, not optional performance niceties.

**Deploying products** need model versions pinned through an approved registry at deploy time so live risk evaluation never runs an experimental or unapproved model.

## Functional requirements

- **FR-001**: The service consumes patient message events from a queue published by the Chat Service. Processing is near-real-time and does not block the patient-facing chat interaction.

- **FR-002**: For each consumed message, the service invokes the risk agent to produce a binary yes/no clinical intervention signal using a versioned, approved risk model resolved from the AI workbench model registry at service startup. Activating a new approved model version requires a service deployment; runtime hot-swap is not supported.

- **FR-003**: Before inference, the service retrieves the full raw message history for the session from the Chat Service and includes it as evaluation context. PHI transmission to the inference provider is permitted only when the provider operates under a signed HIPAA BAA.

- **FR-004**: Processing is idempotent: re-delivery of the same message does not produce duplicate escalation alerts. The message identifier is the deduplication key -- if a risk evaluation record already exists for that message, the re-delivered event is acknowledged and discarded without re-evaluation.

- **FR-005**: When the risk agent returns yes, the service calls the Notification Service within the platform escalation time budget measured from the original message timestamp. When the agent fails after all retries, the message is routed to a dedicated error queue for replay, a risk evaluation record with outcome `failed-pending-review` is written, no automatic escalation is triggered, and an error alert is emitted for operators.

- **FR-006**: A risk evaluation record is stored for every processed message regardless of binary outcome, forming the audit trail for clinical review. Records capture model version, binary outcome, and correlators -- not message text.

- **FR-007**: All inference invocations emit structured records suitable for operational measurement: model version, token count, latency, and binary outcome. On failure, logs include job, session, and message correlators plus error code -- never content fields (message text, prompt, or model response).

- **FR-008**: Patient identity is trusted from upstream internal headers; this service does not perform patient authentication.

- **FR-009**: The HTTP and queue-facing contract surfaces are published and kept aligned with implementation so contract tests and downstream publishers share one authoritative definition.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Events support **measuring** evaluation latency, queue lag, error rate, invocation rate, escalation rate, suppression rate, and model version in use. At minimum, operators can:

  - Detect when evaluations complete and whether escalation was triggered
  - Attribute evaluation duration and end-to-end time to notification dispatch
  - Count duplicate-safe discards, failures, and `failed-pending-review` outcomes
  - Correlate a single message event across Chat Service, risk agent, and notification paths via shared trace identifiers

- **OR-002**: Evidence of a current HIPAA BAA with the inference provider is available before any production deployment involving PHI.

- **OR-003**: Queue lag, error rate, and invocation silence are monitored as primary patient-safety signals; breach conditions route to the platform escalation path with runbook links.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Chat service spec: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Deidentification pipeline spec: [002-deidentification-pipeline.md](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md)
- Notification service spec: [005-notification-service.md](https://github.com/Neosofia/cdp/blob/main/specs/005-notification-service.md)
- AI workbench spec: [006-ai-workbench.md](https://github.com/Neosofia/cdp/blob/main/specs/006-ai-workbench.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Structured log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
