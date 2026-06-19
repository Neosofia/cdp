# Clinical Risk Evaluation

## Why we need this capability

Every patient message may carry a clinical risk signal — suicidal ideation, chest pain, a medication error, or another situation where waiting for a routine reply is unsafe. The platform must evaluate each turn for clinical risk, classify severity, and trigger the alert workflow when human attention is required.

In v1 this capability runs **synchronously on the patient chat path** inside Care Episode ([015-care-episode-service.md](015-care-episode-service.md)). From the patient’s perspective the care assistant reply and risk evaluation happen in the same turn; the platform records both outcomes before the UI shows the response.

## Scope

After a patient content turn is persisted on the Care Episode write path, this capability evaluates clinical risk using conversation history from the message store and recovery context from Care Episode. The evaluator assigns a severity class — low, medium, or high — and maintains a rolling clinical summary on the recovery record for clinician roster and detail views.

Care-assistant inference for the same turn runs in the Chat Service; this capability does not generate patient-facing replies. When escalation is enabled and severity is high, Care Episode requests a clinical alert email through the Notification Service ([005-notification-service.md](005-notification-service.md)).

HIPAA BAA requirement, configurable inference integration, model pinning, and PHI handling constraints for model calls are architectural decisions documented in [ADR-0002](../architecture/adrs/0002-configurable-hipaa-inference-provider.md). Which service invokes the inference provider for assistant vs risk is documented in [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md). Evaluation records and logs carry outcomes and correlators — not message text.

## Client objectives

**Patients in distress** need every turn evaluated so escalation can occur when severity warrants it without them re-explaining urgency in a separate channel.

**Clinicians** need roster and detail views that show recovery severity and a rolling summary so they can prioritise review ([019-cdp-web-application.md](019-cdp-web-application.md)).

**Clinical safety reviewers** need evaluation history per turn and recovery — including which model generation was used and what severity was assigned — without log dumps containing conversation text.

**Platform operators** need to detect when evaluation stops running, errors spike, or the patient chat path becomes too slow to be safe.

## Workflows

**High-severity escalation (happy path).** Given a patient has sent a message in an open recovery and escalation is enabled, when evaluation assigns high severity, then Care Episode requests clinical alert delivery within the configured time budget measured from the original message, stores an evaluation record without message text, and the patient still receives the care-assistant reply for that turn.

**Evaluation failure.** Given evaluation cannot complete after configured retries, when the turn finishes, then no automatic alert is sent, a failure outcome is recorded for review, and operators receive a signal suitable for investigation — without conversation content in logs.

## Functional requirements

- **FR-001**: Each patient chat turn on the Care Episode path receives a clinical risk evaluation after the care-assistant reply for that turn is persisted.

- **FR-002**: Each evaluation uses a versioned, approved risk model configuration fixed at deploy time. Runtime substitution of unreviewed models is not supported.

- **FR-003**: Evaluation uses conversation history from the message store and recovery context from Care Episode. Transmission of clinical content to an external inference provider is permitted only under approved platform agreements and constitutional privacy constraints.

- **FR-004**: Re-processing the same turn does not produce duplicate alert deliveries. An evaluation record for that turn prevents repeated escalation for the same message.

- **FR-005**: When severity is high and escalation is enabled, Care Episode triggers alert delivery within the configured time budget from the original patient message timestamp. When evaluation fails after retries, automatic escalation does not occur and operators are notified through operational signals.

- **FR-006**: An evaluation record is stored for every processed turn regardless of severity. Records capture model generation, severity outcome, summary metadata, and correlators — not message text.

- **FR-007**: Evaluation emits structured operational records suitable for latency, error-rate, and escalation-rate measurement. Failures log correlators and error codes only.

- **FR-008**: Patient identity is established by upstream login and orchestration; the evaluator does not perform its own sign-in flow.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Events support **measuring** evaluation latency, error rate, invocation rate, escalation rate, and active model generation. At minimum, operators can:

  - Confirm when evaluation completed and whether escalation was triggered
  - Count failures and duplicate-safe discards
  - Follow one turn across Care Episode, Chat, and Notification using shared trace correlators

- **OR-002**: Evidence of appropriate agreements for clinical content sent to inference providers is available before production use.

- **OR-003**: Error rate, evaluation silence, and patient chat path latency are monitored as primary patient-safety signals.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Care Episode Service: [015-care-episode-service.md](015-care-episode-service.md)
- Chat service spec: [001-chat-service.md](001-chat-service.md)
- Notification service spec: [005-notification-service.md](005-notification-service.md)
- Inference ADR: [0002-configurable-hipaa-inference-provider.md](../architecture/adrs/0002-configurable-hipaa-inference-provider.md)
- Care Episode orchestration ADR: [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md)
- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
