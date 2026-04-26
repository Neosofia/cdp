# Feature Specification: Deidentification Agent

**Feature Branch**: `002-deidentification-pipeline`
**Created**: 2026-04-17
**Status**: Draft
**Scope**: Agent 1 of 3 in the v1 AI agent pipeline. This spec covers the **Deidentification
Agent** only — an AWS Lambda-based AI agent that triggers at chat session-end, strips all PII and
PHI from raw chat messages, and writes the clean session to the clean chat service for use by
downstream human-accessible workloads (debugging, observability, EDA, model pre-training).

The remaining two v1 agents — the **AI Response Agent** (real-time patient reply generation)
and the **AI Risk Agent** (real-time binary clinical intervention signal) — are specified in
[`010-ai-agent-service`](../010-ai-agent-service/spec.md).

## Clarifications

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Raw Message Is Deidentified and Written to Clean Store (Priority: P1)

A chat session ends and the pipeline is triggered to process all messages in that session. The pipeline
processes each message through a set of models/agents that detect and redact all PII and PHI, producing
a structurally identical but de-identified copy of each message, which is then forwarded to the clean chat
service.

**Why this priority**: This is the core pipeline moment where PHI safety (Constitution Principle I)
is enforced. No AI or model workload may operate without this step. Everything downstream
depends on it.

**Independent Test**: Inject a synthetic message containing known PII/PHI patterns (names,
dates of birth, medications, diagnoses). Verify the clean output contains none of the original
PHI tokens and that a mapping record (original message ID → clean message ID) is stored.

**Acceptance Scenarios**:

1. **Given** a raw message containing patient name, DOB, and medication names is placed on
   the queue, **When** the pipeline processes it, **Then** the clean output replaces all
   identified PHI with placeholder tokens (e.g., `[PERSON]`, `[DATE]`, `[MEDICATION]`),
   and none of the original PHI values appear in the output.
2. **Given** a message with no PII/PHI is processed, **When** the pipeline completes,
   **Then** the clean output is content-identical to the input.
3. **Given** the agent fails to process a message (error or timeout), **When** all retries
   are exhausted, **Then** the message is routed to the quarantine queue and is NOT written
   to the clean store.

---

### User Story 2 — Failed Messages Are Quarantined (Priority: P2)

When a message cannot be deidentified — because the agent returns a failure or a Lambda
timeout occurs — the pipeline routes the message to a quarantine queue for human review
rather than allowing unprocessed output to contaminate the clean store.

**Why this priority**: A false-clean message (PHI that survived deidentification) reaching
the AI workbench is a HIPAA violation. Quarantine is the safety net.

**Independent Test**: Submit a message that triggers a simulated agent failure; verify it
appears in the quarantine queue with the original message ID and that no clean output is
written to the clean store.

**Acceptance Scenarios**:

1. **Given** the deidentification agent returns a failure for a message, **When** the pipeline
   finalises the message, **Then** the message is placed in the quarantine queue and is NOT
   forwarded to the clean chat service.
2. **Given** a Lambda processing a message times out, **When** the event is retried three
   times, **Then** after the third failure the message moves to the quarantine queue and a
   structured alert is emitted.

---

### User Story 3 — Deidentification Models Can Be Updated Without Pipeline Downtime (Priority: P3)

The team can deploy a new version of a deidentification model and have the pipeline use it
for new messages without interrupting processing of in-flight messages.

**Why this priority**: Clinical NLP models improve over time. The ability to update models
independently ensures the pipeline can get better without risky big-bang deployments.

**Independent Test**: Deploy a new model version; verify that messages processed before and
after the deployment are handled by their respective model versions (via version tag in
audit log), and that no messages are lost or duplicated during the transition.

**Acceptance Scenarios**:

1. **Given** a new model version is deployed to Lambda, **When** new messages arrive,
   **Then** they are processed using the new version; in-flight messages on the old version
   are completed before cutover.
2. **Given** a new model version is rolled back, **When** the rollback is applied,
   **Then** the pipeline seamlessly reverts to the previous version for all subsequent messages.

---

### Edge Cases

- What happens when a message language is outside the supported NLP models (e.g., a non-English patient)?
- How does the pipeline handle messages that are entirely images or attachments?
- What if the same message is enqueued twice (duplicate event from chat service retry)?
- What is the maximum acceptable pipeline latency before the downstream AI agents are starved? (Addressed: 1-hour best-effort SLA.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The pipeline MUST be triggered at session-end and process all messages in a
  session as a batch; each message MUST be individually deidentified via AWS Lambda invocations.
  The pipeline MUST consume session-close events from the raw chat SQS queue to initiate processing.
- **FR-002**: The deidentification logic MUST detect and replace at minimum the following PHI
  categories: names, dates (DOB, admission/discharge dates), geographic identifiers below
  state level, phone numbers, email addresses, medical record numbers, health plan numbers,
  medication names, diagnoses, and free-text clinical notes.
- **FR-003**: Each successfully deidentified message MUST be forwarded to the clean chat
  service with the original message ID as a correlation key.
- **FR-004**: PHI MUST NOT appear in any Lambda log output, environment variable, or
  intermediate storage artefact. The pipeline MUST write a correlation key (original
  message ID → clean message ID, plus token-position metadata) to the patient database;
  it MUST NOT store raw PHI values in any pipeline-owned store.
- **FR-005**: Every pipeline invocation MUST produce a structured audit record containing:
  original message ID, Lambda invocation ID, model version used, agent outcome
  (`clean` / `quarantine` / `failed`), and processing duration.
- **FR-006**: Messages where the deidentification agent returns a failure MUST be routed
  to a quarantine queue; they MUST NOT be forwarded to the clean store.
- **FR-007**: The pipeline MUST tolerate Lambda timeouts and SQS visibility timeout
  re-deliveries without producing duplicate clean messages (idempotent processing).
- **FR-008**: Model versions MUST be independently deployable; the model version used MUST
  be recorded in the audit log for every processed message.
- **FR-009**: The pipeline MUST complete deidentification of a session's messages within
  1 hour of the session-close event on a best-effort basis; there is no real-time or
  synchronous latency requirement.
- **FR-010**: Audit records MUST be retained indefinitely; purge or archival policies are
  out of scope for v1 and will be addressed in a future cold-storage migration.
- **FR-011**: The pipeline MUST emit CloudWatch metrics for: sessions processed, messages
  processed, quarantine rate, processing lag (time from session-close event to completion),
  and Lambda error rate. CloudWatch alarms MUST be configured to notify an SNS topic
  (connected to on-call tooling such as PagerDuty, email, or SMS) when:
  - The agent failure/quarantine rate exceeds 5% over a rolling 15-minute window.
  - Any session remains unprocessed beyond the 1-hour SLA window.
  - Lambda error rate exceeds a configurable threshold.

### Key Entities

- **DeidentificationJob**: Job ID, original message ID, tenant ID, model version used,
  agent outcome (`clean` / `quarantine` / `failed`), processing duration, timestamp.
- **PHIToken**: Token type (e.g., `[PERSON]`, `[DATE]`), original value hash (correlation
  key written to the patient database for use by downstream apps), position in original
  message. The pipeline does NOT store the original PHI value; raw PHI is never surfaced
  in any UI. Access control for the patient database is out of scope for this spec.
- **QuarantineRecord**: Original message ID, job ID, reason (agent failure / timeout /
  Lambda error), timestamp, review status.
- **ModelVersion**: Model ID, version tag, deployment timestamp, supported PHI categories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 99.9% of sessions are fully processed (all messages clean or quarantine) within
  1 hour of the session-close event. The pipeline MUST sustain a peak ingest rate of
  **1,800 messages/minute (90 sessions/min)**, derived from the Erlang C model in spec 009
  (peak chat ingestion = 30 msg/sec across all channels; 30 msg/sec ÷ 20 msg/session =
  90 sessions/min). Average load is ~1,000 sessions/hour (~333 msg/min); the 1-hour SLA
  window provides the queue-drain buffer for peak bursts. Real-time processing is not required.
- **SC-002**: Zero PHI tokens appear in the clean output for 100% of test cases using a
  standardised synthetic PHI test suite.
- **SC-003**: The agent failure rate (quarantine) for synthetic "clean" messages (no PHI
  content) is less than 1% (false-failure rate).
- **SC-004**: Duplicate message submissions produce exactly one clean output record (idempotency
  verified for 100% of test cases).
- **SC-005**: Model version updates complete with zero message loss, verified by processing
  count reconciliation before and after deployment.
- **SC-006**: Audit records are produced for 100% of pipeline invocations with no gaps in
  testing.
- **SC-007**: Audit records are durably stored and queryable indefinitely; no records are
  deleted or lost during normal operations (purge/archival policy verification deferred to
  future cold-storage migration feature).

## Assumptions

- The raw chat SQS queue publishes one event per session at session-end, containing the
  session ID and references to the storage locations of all messages in that session
  (not the raw content in the event body, to avoid PHI in queue metadata).
- The Lambda execution environment has a VPC endpoint to access the raw message store
  securely without traversing the public internet.
- AWS Bedrock (under HIPAA BAA) may be used as one component within the deidentification
  pipeline; however, the content sent to Bedrock MUST itself be processed for gross PHI
  removal by a deterministic pre-filter before any LLM interaction.
- A human review workflow for quarantined messages is out of scope for v1 (quarantine queue
  is the boundary; UI tooling for reviewers is a separate feature).
- Attachment/image processing (OCR-based PHI detection) is deferred to a future version.
- Language support for v1 is English only; multilingual support is a future enhancement.
