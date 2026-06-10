# Clean Chat Service

**Initial version:** deferred. Shipped together with the deidentification pipeline ([002-deidentification-pipeline.md](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md)) and chat interaction close ([001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md) FR-004).

## Why we need this service

Engineers debugging deidentification behaviour, data scientists building models, and internal analytics jobs all need conversation-shaped data -- threads, timestamps, channels, directions -- without ever touching raw PHI. The deidentification pipeline produces that data, but it still needs a durable home with the same structural semantics as raw chat so queries, exports, and tooling do not reinvent a second schema.

The Clean Chat Service exists as that home: a separate deployment of the chat storage model pointed at a database that contains **only de-identified** messages and interactions, written exclusively by the pipeline and read only by authorised internal consumers.

## How this service fits into the platform

This service mirrors the Chat Service data model (messages, chat interactions, audit events) but operates on a physically separate database with no shared tables to the raw PHI store. The deidentification pipeline is the sole writer via an internal, network-restricted API; patient-facing and clinician-facing read paths are not exposed. Care episode identifiers and patient UUIDs appear as opaque correlation keys -- resolving a UUID to a real identity requires the patient service, not this store.

PHI removal is guaranteed upstream at the pipeline boundary; this service does not re-scan content on write. Tenant isolation applies on every read and write. Retention enforcement and export orchestration for training schedules live at the infrastructure or product layer; this service provides query and bulk-export surfaces. Schema definitions for shared entities remain authoritative in the Chat Service and Care Episode Service specs rather than duplicated here.

## Client objectives

**Data scientists and ML pipelines** need reliable access to de-identified conversation history and bulk exports for fine-tuning or evaluation -- scoped to their tenant, chronologically ordered, and free of cross-tenant leakage.

**Engineers** need to inspect whether a specific chat interaction was processed correctly after deidentification -- by interaction id or date range -- without access to original PHI or patient-facing endpoints.

**The deidentification pipeline** needs an idempotent write target that accepts batch message and interaction records, deduplicates retries, and creates missing interaction shells when messages arrive first.

**Platform operators** need audit visibility into who read or exported clean data, with logs that never include message content, and configurable retention aligned with compliance obligations.

## Functional requirements

- **FR-001**: The service accepts inbound message and interaction writes from the deidentification pipeline only, via an internal network-restricted write API -- no public write surface reduces the risk of unprocessed PHI entering the clean store.

- **FR-002**: Every message is persisted with de-identified content, platform patient UUID (opaque), chat interaction id, care episode id, tenant id, channel, direction, unique message id, and UTC timestamp so clean data remains structurally comparable to raw chat for downstream tooling.

- **FR-003**: Writes are idempotent: re-delivering the same message id does not create duplicate records -- pipeline retries must not inflate training datasets or debug views.

- **FR-004**: When a message references a chat interaction not yet present, the service creates the interaction record before storing the message so partially ordered pipeline batches still assemble correctly.

- **FR-005**: Tenant isolation is enforced on all reads and writes: callers see only data for tenants they are authorised to access; cross-tenant requests return empty results and emit access-denied audit signals rather than leaking records.

- **FR-006**: A query API supports filtering by tenant, chat interaction id, care episode id, date range, and direction (`inbound` / `outbound`) for interactive investigation and programmatic access.

- **FR-007**: A bulk export API returns messages in a structured format suitable for ML training pipeline ingestion without requiring ad-hoc pagination logic in every consumer.

- **FR-008**: Read access is limited to authenticated employees (engineers and data scientists) with appropriate platform roles; patient and clinician read paths are suppressed by policy and network placement.

- **FR-009**: Configurable data retention policies apply per tenant with a minimum retention period aligned with HIPAA obligations unless a tenant configures a longer period.

- **FR-010**: All reads and writes append structured audit log entries including caller identity, tenant, operation, and record count -- never message content -- so internal access to clean chat remains traceable.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)). Log payloads must not include message content.

- **OR-001**: Operators **measure** write volume, query latency, export size, and access-denied events by tenant.

- **OR-002**: The clean store uses separate database infrastructure from the raw chat store; deployment configuration distinguishes this operational role from the PHI-complete Chat Service without forking application code paths unnecessarily.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Chat Service: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Deidentification pipeline: [002-deidentification-pipeline.md](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md)
- Care Episode Service: [015-care-episode-service.md](https://github.com/Neosofia/cdp/blob/main/specs/015-care-episode-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
