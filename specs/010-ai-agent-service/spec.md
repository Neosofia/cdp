# Feature Specification: AI Risk Agent Service

**Feature Branch**: `010-ai-agent-service`
**Created**: 2026-04-17
**Status**: Draft
**Scope**: Agent 3 of 3 in the v1 AI agent pipeline. This spec covers the **AI Risk Agent**
only — an SQS-consumer service that evaluates each patient message for clinical risk in
near-real-time and returns a binary yes/no intervention signal. A "yes" triggers the alert
workflow via the notification service. This agent runs asynchronously and MUST NOT block
the patient-facing chat interaction.

The **AI Response Agent** (agent 2) has been moved into the chat interface layer
(see [`001-chat-service`](../001-chat-service/spec.md) and the mobile/web app specs);
it streams replies directly to the patient via the inference provider.
The **Deidentification Agent** (agent 1, session-end batch) is specified in
[`002-deidentification-pipeline`](../002-deidentification-pipeline/spec.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Risk Agent Evaluates a Message and Returns a Binary Signal (Priority: P1)

A patient message is placed on the risk agent queue by the chat service. The risk agent
consumes it, evaluates it against a clinical risk model, and returns a binary yes/no
intervention signal. The patient's chat interaction is not blocked; the risk agent
operates asynchronously alongside the chat flow.

**Why this priority**: Clinical risk detection is a core patient safety function (Constitution
Principle II). Missing a risk signal has potential life-threatening consequences.

**Independent Test**: Place a synthetic message containing a high-risk indicator on the
queue; verify the risk agent returns "yes", calls the notification service within 60 seconds
of the message timestamp, and logs the binary outcome and model version.

**Acceptance Scenarios**:

1. **Given** a patient message contains a clinical risk indicator, **When** the risk agent
   processes it, **Then** the agent returns "yes" and the notification service is called
   within 60 seconds of the original message timestamp.
2. **Given** a patient message contains no clinical risk indicator, **When** the risk agent
   processes it, **Then** the agent returns "no", no escalation is triggered, and the
   binary evaluation result is stored for audit purposes.
3. **Given** the risk agent itself fails (model error or timeout), **When** all retries are
   exhausted, **Then** the failed evaluation is routed to a human review queue; no
   automatic escalation is triggered, and an error alert is emitted.

---

### User Story 2 — Risk Agent Processes Without Blocking the Chat Interaction (Priority: P2)

The patient sends a message and receives a streamed AI reply from the chat interface
immediately. In parallel, the chat service publishes the message to the risk agent SQS
queue. The risk agent processes and, if warranted, triggers an escalation — entirely
decoupled from the patient's visible chat experience.

**Why this priority**: The risk agent must never introduce latency into the patient-facing
chat flow. Decoupling via SQS enforces this guarantee architecturally.

**Independent Test**: Simulate a high-volume message burst; verify that risk agent queue
lag does not affect response latency in the chat interface, and that all enqueued messages
are evaluated within the near-real-time SLA.

**Acceptance Scenarios**:

1. **Given** the risk agent queue has accumulated lag, **When** a patient sends a message,
   **Then** the chat interface response latency is unaffected.
2. **Given** the risk agent is temporarily unavailable, **When** messages accumulate on the
   queue, **Then** they are processed in order upon recovery with no messages lost.

---

### Edge Cases

- What happens if the SQS visibility timeout expires before the risk agent completes evaluation?
- How does the service avoid processing the same message twice if a Lambda is retried?
- What PHI logging controls are in place to ensure raw session content never appears in
  service logs or audit records (even though it is permitted to flow to the inference provider)?
- What is the maximum acceptable queue lag before near-real-time guarantees are considered breached? **Resolved: 30 seconds (see SC-006).**

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST consume patient messages from an SQS queue published by the
  chat service; messages MUST be processed in near-real-time without blocking the patient
  chat interaction.
- **FR-002**: For each consumed message, the service MUST invoke the risk agent to produce
  a binary yes/no clinical intervention signal.
- **FR-003**: Risk agent processing MUST be idempotent: re-delivery of the same SQS message
  MUST NOT produce duplicate escalation alerts. The SQS `MessageId` MUST be used as the
  deduplication key; if a `RiskEvaluation` record already exists for a given `MessageId`,
  the re-delivered message MUST be acknowledged and discarded without re-evaluation.
- **FR-004**: The risk agent MUST source the full raw session history from the chat service
  for evaluation context. PHI MAY be transmitted to the AI inference provider provided
  the provider operates under a signed HIPAA BAA (Constitution Principle I).
- **FR-005**: Before invoking the AI inference provider, the risk agent MUST retrieve the
  full raw message history for the session from the chat service and include it as context
  in the evaluation prompt.
- **FR-006**: The risk agent MUST evaluate each message using a versioned, approved risk
  model; the model version MUST be resolved from the Bedrock AI workbench registry once
  at service startup. Deploying a new approved model version requires a service deployment.
- **FR-007**: If the risk agent returns "yes", the service MUST call the notification
  service within 60 seconds of the original message timestamp. If the risk agent fails
  after all retries, the SQS message MUST be routed to a dedicated Dead Letter Queue (DLQ)
  for replay, AND a `RiskEvaluation` record with outcome `failed-pending-review` MUST be
  written to the database to provide a queryable audit trail for human reviewers. No
  automatic escalation MUST be triggered; an error alert MUST be emitted.
- **FR-008**: All AI inference invocations MUST be logged with: model version, token
  count, latency, binary outcome. On evaluation failure, the service MUST emit a
  structured log record containing: job ID, session ID, chat message ID, SQS message ID,
  error code, model version, and latency. No content fields (message text, prompt, or
  response) MUST appear in any log or audit record. Cross-service correlation with
  sanitised chat service logs provides full debug context without PHI exposure.
- **FR-009**: The risk agent MUST store a risk evaluation record for every processed
  message regardless of binary outcome; this forms the audit trail for clinical review.
- **FR-010**: The risk agent type and its model version MUST be configuration-driven and
  resolved at service startup from the Bedrock AI workbench registry. Activating a new
  approved model version requires a service deployment; no runtime hot-swap is supported.

### Key Entities

- **AgentJob**: Job ID, message ID, session ID, patient ID, tenant ID,
  status (`pending` / `running` / `completed` / `failed`), started at, completed at.
- **AgentResult**: Result ID, job ID, binary outcome (`yes` / `no` / `failed-pending-review`),
  model version, token count, latency, stored at.
- **RiskEvaluation**: Evaluation ID, SQS message ID (unique deduplication key), chat message ID,
  session ID, patient ID, tenant ID, model version, binary outcome
  (`escalated` / `no-action` / `failed-pending-review`), evaluation timestamp.
  Records with `failed-pending-review` outcome serve as the queryable human-review audit
  trail; the corresponding raw SQS message is retained in the risk agent DLQ for replay.
- **RiskAgentConfig**: Model version reference, prompt template reference, timeout,
  retry policy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 99.9% of risk agent evaluations complete and, where the outcome is "yes",
  trigger a notification service call — all within 60 seconds of the original message
  timestamp (end-to-end budget covering both risk evaluation and notification delivery).
- **SC-003**: The AI inference provider used by the risk agent operates under a signed
  HIPAA BAA; evidence of a current BAA MUST be available before any production deployment.
- **SC-004**: Duplicate message deliveries (SQS re-delivery) produce zero duplicate
  escalations, verified by idempotency tests.
- **SC-005**: Binary risk evaluation records are produced for 100% of processed messages,
  verified by record count reconciliation against queue event counts in testing.
- **SC-006**: SQS queue lag MUST NOT exceed 30 seconds; lag exceeding this threshold
  constitutes a near-real-time SLA breach and MUST trigger an operational alarm.
  The remaining ≤30-second budget covers risk evaluation and notification service delivery.

## Assumptions

- The chat service publishes a message event to the risk agent SQS queue for every inbound
  patient message; this is a fire-and-forget publish that does not block the chat flow.
- The risk agent evaluates the full raw session history sourced directly from the chat
  service. PHI transmission to the inference provider is permitted under the HIPAA BAA.
- The clean chat service is exclusively for human-accessible workloads (debugging,
  observability, model pre-training); the risk agent does not depend on it.
- The risk model used by the risk agent is pre-approved via an AI workbench promotion
  workflow; no unapproved experimental model may be used in the live pipeline.
- The AI Response Agent (streaming chat reply to the patient) is implemented within the
  chat interface layer and is out of scope for this service; it calls an AI inference
  provider with a signed HIPAA BAA and streams the response directly to the patient.
- The risk agent does not directly handle patient authentication; patient identity is
  carried as a trusted internal header from the upstream chat service.
