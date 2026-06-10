# Deidentification Pipeline

**Initial version:** deferred. Shipped together with chat interaction close and interaction-end events ([001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md) FR-004) and the clean chat store ([003-clean-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/003-clean-chat-service.md)). Until then, clinicians and real-time agents use the raw PHI chat store; employee and ML workloads must not consume production chat data.

## Why we need this service

Raw patient chat is PHI-complete by design -- names, dates, medications, and free-text clinical detail must survive in the chat store so clinicians and real-time agents can act on what was actually said. Employee debugging, observability, exploratory analysis, and model pre-training cannot safely use that same store. Constitution Principle I requires a deliberate boundary: PHI is stripped before any human-accessible clean workload or batch ML pipeline sees message text.

The Deidentification Pipeline exists to enforce that boundary at scale. When a chat interaction ends, it processes every message in the session, detects and replaces identifiable content, forwards clean copies to the clean chat service, and quarantines anything it cannot confidently deidentify -- so downstream consumers never inherit raw PHI by accident.

## How this service fits into the platform

The pipeline is event-driven and session-scoped. The Chat Service publishes an interaction-end event (identifiers only); this pipeline consumes that signal, reads the full message log from raw storage over an internal network path, and runs each message through deidentification models -- optionally including an AI inference step only after a deterministic pre-filter removes gross PHI. Successfully cleaned messages are written to the Clean Chat Service with correlation keys; failures route to a quarantine queue rather than contaminating the clean store.

Real-time patient-facing agents (AI Response, AI Risk) are specified separately and may operate on raw content under BAA-covered providers; this pipeline is the batch path for **post-interaction** clean data. Correlation metadata (original message id to clean message id, token positions) may be written to the patient database for downstream apps; raw PHI values are never stored in pipeline-owned artefacts, logs, or queue bodies. Human review tooling for quarantined messages, attachment OCR, and multilingual models are out of scope for the initial version -- English text only, quarantine as the safety net.

## Client objectives

**Compliance and security stakeholders** need assurance that employee and ML workloads never receive raw PHI from chat -- and that anything the pipeline cannot clean is isolated, auditable, and never forwarded as if it were safe.

**Engineers and data scientists** need structurally identical conversation copies with placeholders instead of identifiers, correlated back to source messages when debugging pipeline behaviour -- without ever seeing original PHI in the clean store.

**Platform operators** need to deploy improved deidentification models without stopping in-flight work, measure processing lag and quarantine rates, and detect sessions that stall before the clean store is updated.

**Downstream services** need idempotent, batch-complete session processing so a retried event or a model upgrade does not duplicate clean records or drop messages silently.

## Functional requirements

- **FR-001**: The pipeline is triggered at chat interaction end and processes all messages in that interaction as a batch, consuming interaction-end events from the raw chat event queue and fetching full content from raw storage -- events carry references, not message bodies, so queue metadata stays PHI-free.

- **FR-002**: Each message is individually deidentified. At minimum, the logic detects and replaces names, dates (including date of birth and admission or discharge dates), geographic identifiers below state level, phone numbers, email addresses, medical record numbers, health plan numbers, medication names, diagnoses, and free-text clinical notes with placeholder tokens (for example `[PERSON]`, `[DATE]`, `[MEDICATION]`).

- **FR-003**: Messages with no detectable PII or PHI pass through content-identical; successfully deidentified messages are forwarded to the clean chat service with the original message id as a correlation key.

- **FR-004**: PHI does not appear in agent logs, environment variables, or intermediate pipeline storage. Correlation keys and token-position metadata may be persisted for downstream use; raw PHI values are never written to pipeline-owned stores.

- **FR-005**: When deidentification fails or times out after retries, the message is routed to a quarantine queue and is not written to the clean store -- a false-clean message reaching employee or ML workloads is treated as a safety violation, not a degraded success path.

- **FR-006**: Processing is idempotent: queue re-deliveries and duplicate events produce exactly one clean output record per original message id.

- **FR-007**: Model versions are independently deployable; the version used for each message is recorded in audit output so operators can reconcile behaviour before and after upgrades or rollbacks without losing in-flight work.

- **FR-008**: Every pipeline invocation produces a structured audit record with original message id, invocation id, model version, outcome (`clean`, `quarantine`, or `failed`), and processing duration. Audit records are retained indefinitely in the initial version; cold-storage archival policy is a future concern.

- **FR-009**: Deidentification completes on a best-effort basis within one hour of the interaction-end event -- this is a batch hygiene path, not a real-time synchronous step in the patient reply loop.

- **FR-010**: Platform metrics cover sessions processed, messages processed, quarantine rate, processing lag from interaction end to completion, and agent error rate so operators can alert on elevated failure or backlog without embedding alert thresholds in this spec.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Operators **measure** pipeline throughput, lag, quarantine rate, and error rate.

- **OR-002**: The pipeline runs in an execution environment with internal network access to raw message storage. Any external AI inference provider used within the pipeline operates under a HIPAA BAA, with deterministic pre-filtering applied before LLM interaction.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Chat Service: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Clean Chat Service: [003-clean-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/003-clean-chat-service.md)
- AI Agent Service: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
