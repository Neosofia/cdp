# Clinical Risk Evaluation (AI Risk Agent)

**Initial version:** Clinical risk evaluation runs **synchronously** inside the Chat Service real-time care assistant on each patient turn — the same path that produces the conversational reply ([001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md) FR-011). Care-episode context for evaluation is attached when the patient starts a new conversation ([015-care-episode-service.md](https://github.com/Neosofia/cdp/blob/main/specs/015-care-episode-service.md) FR-015) and retained for the thread. There is no separate queue-consuming risk microservice in v1.

**Future:** If combined inference latency or throughput exceeds capacity targets, risk evaluation may be extracted to an **asynchronous** service per the queue-based requirements below — without changing binary outcomes, audit records, or escalation semantics.

## Why we need this capability

Every inbound patient message may carry a clinical risk signal -- suicidal ideation, chest pain, medication error, or another situation where waiting for a routine reply is unsafe. The platform must evaluate each patient message for clinical risk, return a binary intervention signal, and trigger the alert workflow when the answer is yes.

This spec covers **clinical risk evaluation** in the v1 AI pipeline. The conversational reply agent lives in the Chat Service; deidentification (session-end batch processing) is specified separately. In v1, response and risk share one synchronous agent turn; splitting them async is an operational escape hatch, not the initial delivery model.

## How this capability fits into the platform

**Initial version:** When the Chat Service handles an inbound patient message, the care assistant invokes a versioned approved model that produces both the patient-facing reply and a binary clinical-risk outcome. Episode and conversation context come from authoritative care-episode data supplied when the patient started the chat and from stored conversation state. If the outcome is yes, the platform triggers the Notification escalation path within the platform time budget. Risk evaluation records and correlators are persisted per FR-006; message text does not appear in logs.

**Future (async service):** When extracted for scale, the Chat Service may publish fire-and-forget events after storing each inbound message. A dedicated consumer retrieves session context, invokes the risk model, and performs escalation and audit as specified in the functional requirements below — without blocking the visible chat reply path.

PHI may flow to the inference provider under a signed HIPAA BAA -- the same constitutional constraint as other AI workloads -- but raw message content, prompts, and model responses never appear in service logs or audit records. Cross-service correlation uses sanitised identifiers only. Failed evaluations after retries land in a human-review path with a queryable audit record; automatic escalation is not triggered on agent failure.

## Client objectives

**Patients in distress** need their messages evaluated on every turn so escalation can fire when the model says intervention is warranted -- v1 accepts combined inference latency on the completions path; async extraction is the scale escape hatch if that latency becomes unacceptable.

**Clinicians and on-call staff** need timely, deduplicated escalation alerts when the risk model says intervention is warranted, and a reliable audit trail showing which messages were evaluated, with what model version, and what binary outcome resulted.

**Clinical safety reviewers** need to reconstruct evaluation history per message and session, including failed evaluations routed for human review, without log dumps containing raw chat content.

**Platform operators** need to detect when risk evaluation stops running, errors at scale, or drives unacceptable completion latency. **Initial version:** completion-path latency and error rate are primary patient-safety signals. **Future async path:** queue lag joins those signals.

**Deploying products** need model versions pinned through an approved registry at deploy time so live risk evaluation never runs an experimental or unapproved model.

## Functional requirements

Outcome requirements apply in v1 (sync in Chat) and in any future async deployment.

- **FR-001**: Each inbound patient message receives a clinical risk evaluation. **Initial version:** evaluation runs synchronously in the Chat Service care-assistant turn ([001](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md) FR-011). **Future:** a dedicated service may consume patient message events from a queue published by the Chat Service so processing does not share the reply request path.

- **FR-002**: For each evaluated message, the platform invokes the risk agent to produce a binary yes/no clinical intervention signal using a versioned, approved risk model resolved from the AI workbench model registry at deploy time. Activating a new approved model version requires a deployment; runtime hot-swap is not supported.

- **FR-003**: Before inference, the evaluator retrieves the full raw message history for the session and care-episode context (from interaction snapshot and Care Episode records). PHI transmission to the inference provider is permitted only when the provider operates under a signed HIPAA BAA.

- **FR-004**: Processing is idempotent: re-delivery of the same message does not produce duplicate escalation alerts. The message identifier is the deduplication key -- if a risk evaluation record already exists for that message, the re-delivered event is acknowledged and discarded without re-evaluation.

- **FR-005**: When the risk agent returns yes, the platform calls the Notification Service within the escalation time budget measured from the original message timestamp. **Initial version:** Chat performs this call after the synchronous evaluation. When evaluation fails after retries, a risk evaluation record with outcome `failed-pending-review` is written, no automatic escalation is triggered, and an error alert is emitted for operators. **Future async path:** failed messages may additionally route to a dedicated error queue for replay.

- **FR-006**: A risk evaluation record is stored for every processed message regardless of binary outcome, forming the audit trail for clinical review. Records capture model version, binary outcome, and correlators -- not message text.

- **FR-007**: All inference invocations emit structured records suitable for operational measurement: model version, token count, latency, and binary outcome. On failure, logs include job, session, and message correlators plus error code -- never content fields (message text, prompt, or model response).

- **FR-008**: Patient identity is trusted from upstream platform tokens and internal service calls; the risk evaluator does not perform patient authentication.

- **FR-009**: Contract surfaces are published and kept aligned with implementation. **Initial version:** risk outcomes and escalation handoff are part of the Chat Service API and internal Notification call. **Future:** queue and HTTP contracts for a standalone consumer are added when async extraction ships.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Events support **measuring** evaluation latency, error rate, invocation rate, escalation rate, suppression rate, and model version in use. **Initial version:** include care-assistant completion duration on the Chat path. **Future async path:** add queue lag. At minimum, operators can:

  - Detect when evaluations complete and whether escalation was triggered
  - Attribute evaluation duration and end-to-end time to notification dispatch
  - Count duplicate-safe discards, failures, and `failed-pending-review` outcomes
  - Correlate a single message across Chat Service, risk evaluation, and notification paths via shared trace identifiers

- **OR-002**: Evidence of a current HIPAA BAA with the inference provider is available before any production deployment involving PHI.

- **OR-003**: Error rate, invocation silence, and (v1) completion-path latency — plus (future async) queue lag — are monitored as primary patient-safety signals; breach conditions route to the platform escalation path with runbook links.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Chat service spec: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Deidentification pipeline spec: [002-deidentification-pipeline.md](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md)
- Notification service spec: [005-notification-service.md](https://github.com/Neosofia/cdp/blob/main/specs/005-notification-service.md)
- AI workbench spec: [006-ai-workbench.md](https://github.com/Neosofia/cdp/blob/main/specs/006-ai-workbench.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Structured log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
