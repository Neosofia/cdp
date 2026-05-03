# Feature Specification: Clean Chat Service

**Feature Branch**: `003-clean-chat-service`
**Created**: 2026-04-17
**Status**: Draft
**Input**: A second deployment of the 001 Chat Service codebase pointed at a separate
database that contains only de-identified chat data written by the deidentification pipeline
(002). Serves as the primary data source for employee debugging and ML/AI EDA and model pre-training.
Contains no PHI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Deidentification Pipeline Writes a Clean Chat Interaction (Priority: P1)

After a chat interaction ends, the deidentification pipeline processes the full interaction
log, replaces PHI with tokens, and writes the clean messages and session records into this
service. The service stores them in the same schema as 001, referencing the same platform
patient UUID (which is opaque and not directly identifying).

**Why this priority**: This is the write path — the service has no value without reliable
ingestion from the pipeline.

**Independent Test**: The pipeline posts a batch of synthetic clean messages for a completed
interaction; verify all messages are stored with the correct patient UUID, chat interaction
ID, care episode ID, tenant ID, channel, direction, and timestamp, and that no original PHI
values appear in the stored content.

**Acceptance Scenarios**:

1. **Given** the deidentification pipeline sends a clean message payload for a completed
   interaction, **When** the service receives it, **Then** each message is stored with its
   clean content, patient UUID, chat interaction ID, care episode ID, tenant ID, channel,
   direction, and timestamp.
2. **Given** the pipeline sends the same message ID twice (e.g., a retry), **When** the
   second write arrives, **Then** the service deduplicates it and stores exactly one record.
3. **Given** a clean message arrives referencing a chat interaction that does not yet exist
   in this store, **When** the service processes it, **Then** a new ChatInteraction record
   is created before the message is stored.

---

### User Story 2 — Data Scientist Queries Clean Conversation History for ML Training (Priority: P2)

A data scientist or ML training job queries the clean chat service to retrieve conversation
threads for model fine-tuning or evaluation. Tenant isolation is enforced; no patient-facing
read paths are exposed.

**Why this priority**: This is the primary consumer of the clean store. ML/AI model quality
depends on reliable access to clean, well-structured data.

**Independent Test**: An authenticated employee service account queries all chat interactions
for a tenant over a date range; verify correct interaction and message counts, correct
chronological ordering, and that no records from other tenants are returned.

**Acceptance Scenarios**:

1. **Given** an authenticated data scientist queries clean chat interactions for a specific
   tenant and date range, **When** the query executes, **Then** all matching interactions
   are returned in chronological order with their message threads intact.
2. **Given** a caller queries with a tenant ID outside their authenticated scope, **When**
   the request is made, **Then** the response returns empty results and an access-denied
   event is logged.
3. **Given** a training data export is requested for a date range, **When** the export
   completes, **Then** all messages in the range are returned in a structured format
   suitable for model fine-tuning ingestion.

---

### User Story 3 — Engineer Inspects Clean Messages for Pipeline Debugging (Priority: P3)

An engineer investigates a suspected deidentification issue by querying the clean store to
check whether a specific chat interaction was processed correctly, without ever seeing the
original PHI.

**Why this priority**: Debugging is a support function — important for team velocity but not
a blocking capability.

**Independent Test**: Query by chat interaction ID; verify the returned messages match the
expected count and contain no recognisable PHI patterns.

**Acceptance Scenarios**:

1. **Given** an engineer queries by chat interaction ID, **When** the results are returned,
   **Then** only messages belonging to that interaction within the engineer's authorised
   tenant scope are included.

---

### Edge Cases

- How does the service handle a message written out-of-order relative to its interaction timestamp?
- What happens if the pipeline writes a chat interaction record but then fails before writing all messages?
- What happens when the tenant isolation check fails at write time (misconfigured pipeline routing)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST accept inbound message and session writes from the
  deidentification pipeline (002) only, via an internal network-restricted write API. No public write
  endpoint is exposed.
- **FR-002**: Every message MUST be persisted with its clean (de-identified) content,
  patient UUID (platform-generated, opaque), chat interaction ID, care episode ID, tenant ID,
  channel, direction, unique message ID, and UTC timestamp.
- **FR-003**: Message writes MUST be idempotent: re-delivering the same message ID MUST NOT
  produce duplicate records.
- **FR-004**: The service MUST enforce tenant isolation: reads MUST be scoped to the
  authenticated caller's tenant and MUST NOT return cross-tenant data.
- **FR-005**: The service MUST expose a query API supporting filtering by tenant, chat
  interaction ID, care episode ID, date range, and direction (`inbound`/`outbound`).
- **FR-006**: The service MUST support a bulk export API returning messages in a structured
  format for ML training pipeline consumption.
- **FR-007**: All writes and reads MUST produce structured audit log entries including caller
  identity, tenant, operation, and record count. Log entries MUST NOT contain message content.
- **FR-008**: Read access is restricted to authenticated employees (engineers and data
  scientists) with appropriate RBAC roles; patient-facing and clinician-facing read paths
  are suppressed by network policy and MUST NOT be reachable from outside the internal network.
- **FR-009**: The service MUST support configurable data retention policies per tenant
  (minimum 7 years for HIPAA compliance, unless the tenant overrides to a longer period).

### Key Entities

All entities (Message, ChatInteraction, AuditEvent) are owned by the **001 Chat Service** spec and are not redefined here. **CareEpisode** is owned by **015 Care Episode Service**. This service stores de-identified copies of those records; consult `001-chat-service/spec.md` and `015-care-episode-service/spec.md` for canonical schema definitions.

Note: The patient ID stored in all entities is a platform-generated UUID assigned by the
patient service. It does not directly identify the patient; resolving it to a real identity
requires a call to the patient service, which is covered in a separate spec.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clean messages are stored within 1 second of being received from the pipeline
  for 99.9% of writes.
- **SC-002**: Tenant isolation is verified by automated tests confirming zero cross-tenant
  data leakage across 100% of test cases.
- **SC-003**: Query API returns interaction results in under 500 ms for interactions up to
  1,000 messages.
- **SC-004**: Bulk export API supports 1 million messages per export without timeout or
  data loss.
- **SC-005**: Duplicate write submissions produce exactly one stored record for 100% of
  test cases.

## Assumptions

- 003 is a deployment of the 001 service configured for a different operational role; all functional differences are controlled via deployment configuration.
- The clean store and raw store share no database tables; they are entirely separate database
  instances.
- PHI removal is guaranteed by the deidentification pipeline (002); 003 applies no
  additional PHI scanning at the write boundary.
- The patient UUID stored in this service is opaque — it does not directly identify the
  patient. Cross-referencing to a real patient identity requires the patient service
  (separate spec).
- Data retention enforcement (TTL deletion) is implemented at the database layer, not
  application code.
- Model training export scheduling and orchestration are out of scope; this service provides
  only the export API endpoint.
- A HIPAA BAA with AWS covers all storage infrastructure for this service.
- Authentication and identity tokens are validated by an upstream API gateway before
  reaching this service.
