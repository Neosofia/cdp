# Feature Specification: EMR Service

**Feature Branch**: `004-emr-service`
**Created**: 2026-04-17
**Status**: Draft
**Input**: A proxy/facade service that provides a unified, vendor-agnostic FHIR R4 interface
to multiple upstream EMR/EHR systems. All other platform services interact with this service
rather than directly with any EMR vendor. May be fulfilled in whole or in part by a
third-party managed service or open-source self-hosted solution (e.g., HAPI FHIR Server,
Health Gorilla, 1up Health) — see Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Patient Context Retrieved for a Chat Session (Priority: P1)

Two actors consume patient clinical context through the EMR service during a chat session:

- **AI Agent**: needs medications, diagnoses, and discharge summary to perform risk assessment
  and generate informed responses, querying the EMR service via the AI Agent Service (010).
- **Clinician**: reviews the same patient record through the Web Chat App (008), which
  fetches the canonically normalised patient context from the EMR service to display
  alongside the chat.

In both cases the EMR service fetches the relevant resources from the upstream EMR,
normalises them to the platform's canonical schema, and returns them to the caller —
without the caller needing to know which EMR the patient's data lives in.

**Why this priority**: AI and human risk assessment depends on patient context. Without 
reliable patient record retrieval neither actor can operate effectively. This is the most critical 
read path.

**Independent Test**: With a mock FHIR server standing in for an EMR, query the EMR service
for a patient's MedicationRequest and Condition resources from both an AI agent caller and
a clinician-app caller; verify both responses conform to the canonical internal schema and
that no vendor-specific fields appear in the output.

**Acceptance Scenarios**:

1. **Given** an AI agent requests a patient's active medications, **When** the EMR service
   queries the upstream FHIR endpoint, **Then** a list of canonically normalised
   MedicationRequest resources is returned within 2 seconds.
2. **Given** a clinician opens a patient record in the Web Chat App, **When** the app
   requests patient context from the EMR service, **Then** the canonically normalised
   patient record is returned within 2 seconds and displayed without vendor-specific fields.
3. **Given** the upstream EMR is temporarily unavailable, **When** the request times out,
   **Then** the service returns a structured error and the caller receives a graceful
   degradation response (not a 500); availability of the rest of the platform is unaffected.
4. **Given** the patient exists in more than one connected EMR (e.g., transferred care),
   **When** data is retrieved, **Then** the service merges or prioritises records per
   a configured precedence rule and returns a single consolidated response.

---

### User Story 2 — Configuration of a New EMR Integration (Priority: P2)

The engineering team configures a new hospital organisation's EMR connection (endpoint,
credentials, tenant mapping) without modifying core application code. Configuration is
performed inside the 3rd-party FHIR abstraction platform (TBD during planning) and governed
by an internal Standard Operating Procedure (SOP) that defines the required steps, credential
handling, and verification checks for each new integration.

**Why this priority**: Multi-tenant SaaS growth depends on the ability to onboard new hospital
systems quickly. Configuration-driven onboarding — backed by a repeatable SOP — is the enabler.

**Independent Test**: Add a new mock EMR endpoint via configuration only (no code change),
following the steps in the onboarding SOP; verify the service routes requests for that tenant
to the new endpoint and returns data correctly.

**Acceptance Scenarios**:

1. **Given** a new EMR connection is configured for a tenant following the onboarding SOP,
   **When** a query is made for a patient in that tenant, **Then** the service routes to
   the new EMR endpoint and returns normalised data.
2. **Given** a tenant's EMR configuration is removed or disabled, **When** a query is made,
   **Then** the service returns a structured "integration not configured" error rather
   than a generic failure.

---

### User Story 3 — Discharge Summary Retrieval for Post-Discharge Onboarding (Priority: P3)

When a patient is enrolled in the post-discharge care programme, the platform retrieves
their discharge summary and relevant history from the EMR to initialise their care context.

**Why this priority**: A good care context improves AI model accuracy from day one of
patient enrolment. Important but not blocking for the core chat/alert flow.

**Independent Test**: Query the EMR service for a patient's most recent Encounter and
associated ClinicalImpression resources; verify the canonical discharge summary object
is returned with expected fields populated. Then simulate a patient with no EMR records
and verify a low-priority alert is raised via the escalation platform.

**Acceptance Scenarios**:

1. **Given** a patient is enrolled with a valid EMR patient ID, **When** the discharge
   summary is requested, **Then** the canonical discharge summary object is returned with
   the most recent Encounter, discharge diagnosis, and follow-up instructions.
2. **Given** no discharge summary or EMR records exist for a newly enrolled patient,
   **When** the request is made, **Then** an empty-but-valid canonical response is returned
   to the caller AND a low-priority alert is raised via the escalation platform (e.g., PagerDuty) to trigger the missing-record
   review workflow; no unhandled error is raised.

---

### Edge Cases

- **Cross-EMR patient identity**: The internal patient identifier mapping table is the authoritative source of truth for which EMR(s) a patient is mapped to. The service queries exactly those mapped EMRs and does not need to detect or surface missing mappings — unmapped EMRs are simply not queried.
- **FHIR version abstraction**: Normalization of upstream FHIR versions (DSTU2, STU3, R4) is expected to be handled by a 3rd-party managed service evaluated during planning. The internal canonical schema must label each record with its resource type; strict FHIR R4 wire-format conformance in the internal representation is not required provided AI agents can identify record type.
- What is the caching strategy for frequently read, slow-changing records (e.g., allergies)?
- **Large patient histories**: Because the cache and query scope is limited to records dated on or after the patient's most recent discharge date (covering the procedure plus ~30 days post-discharge), result sets are expected to be well under 50 records. No explicit pagination or per-type cap is required for v1.
- **Partially invalid FHIR resources**: The service returns all valid resources; invalid ones are omitted and identified in a `warnings[]` list in the response. Callers receive a partial-but-usable response rather than a full rejection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 3rd party service MUST expose a unified internal API that abstracts all EMR vendor
  differences; callers MUST interact only with the platform's canonical FHIR R4-based schema.
- **FR-002**: No EMR vendor SDKs, proprietary data formats, or vendor-specific identifiers
  MUST appear outside the `integrations/` module boundary.
- **FR-003**: The service MUST support at minimum these clinical resource types: Patient,
  Encounter, MedicationRequest, Condition, AllergyIntolerance, Observation, and
  DocumentReference (discharge summary). Each resource in the internal canonical schema
  MUST carry an explicit `resourceType` label so that AI agents can identify record type
  regardless of the upstream FHIR version. Normalisation of upstream FHIR versions
  (DSTU2/STU3/R4) is delegated to a 3rd-party abstraction layer selected during planning.
- **FR-004**: Each EMR connection MUST be configurable per tenant via a configuration store
  (endpoint URL, OAuth2/SMART credentials, FHIR base path) without code changes.
- **FR-005**: The service MUST enforce that only authenticated callers with a valid
  patient-access permission may retrieve patient records; PHI access MUST be audit-logged.
- **FR-006**: The service MUST respond within 2 seconds for the 95th percentile of requests
  under normal upstream availability; upstream latency MUST be surfaced in metrics.
- **FR-007**: The service MUST implement a shared cache for patient FHIR
  resources scoped to records dated on or after the patient's most recent discharge date.
  The cache MUST be primed when a chat session starts and MUST use a sliding TTL of
  15 minutes (matching the chat session timeout), refreshed on each cache access triggered
  by a chat interaction; entries expire when no chat interaction has touched them within
  that window.
- **FR-008**: The service MUST return a structured, machine-readable error when an upstream
  EMR is unavailable, rather than propagating raw HTTP errors.
- **FR-009**: The service MUST be independently testable against FHIR R4 mock servers without
  requiring live EMR connections.
- **FR-010**: The service MUST record per-request metrics (upstream response time, cache
  hit/miss rate, error rate) per tenant and per EMR integration.
- **FR-011**: When the upstream FHIR server returns a bundle containing partially invalid
  resources, the service MUST return all successfully normalised resources and include a
  `warnings[]` array in the response identifying each omitted resource by type and FHIR ID;
  it MUST NOT reject the entire response due to a subset of invalid resources.
- **FR-012**: When a discharge summary or EMR record retrieval for a newly enrolled patient
  returns no records, the service MUST raise a low-priority alert via the escalation platform (e.g., PagerDuty) to trigger the
  missing-record review workflow; the empty-but-valid canonical response MUST still be
  returned to the caller.

### Key Entities

- **PatientContext**: Internal patient ID, tenant ID, canonical demographics, active medications,
  active conditions, allergies, most recent discharge summary reference.
- **EMRIntegration**: Integration ID, tenant ID, EMR vendor hint, FHIR base URL, auth scheme,
  credential reference (identifier in the platform secrets store), status (active/disabled).
- **FHIRCacheEntry**: Resource type, FHIR resource ID, tenant ID, patient ID, canonical
  normalised payload, cached-at timestamp, last-touched-at timestamp, sliding TTL
  (15 min default); scoped to records on or after the patient's most recent discharge date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of patient context queries complete in under 2 seconds end-to-end.
- **SC-002**: The service onboards a new EMR integration without code deployment, verified
  by adding a test integration via configuration and confirming successful queries within
  the same deployment.
- **SC-003**: Zero vendor-specific fields or identifiers appear in outbound responses from
  the integration abstraction layer, verified by automated schema validation tests.
- **SC-004**: Read-through cache reduces upstream FHIR server calls by at least 40% for
  repeat queries within the cache TTL window.
- **SC-005**: The service returns a structured error (not a timeout or 500) for 100% of
  test cases simulating upstream EMR unavailability.
- **SC-006**: PHI access audit log records are produced for 100% of patient context reads
  in testing.

## Assumptions

- All EMR integrations are expected to be fronted by a 3rd-party managed service or
  open-source FHIR adaptor (e.g., HAPI FHIR, Health Gorilla, 1up Health) that handles
  FHIR version normalisation (DSTU2/STU3/R4) and vendor-specific protocol differences;
  the specific provider is to be evaluated during planning. Legacy HL7 v2 support remains
  deferred to a future version.
- A third-party managed service or open-source self-hosted FHIR server (e.g., HAPI FHIR)
  may be used to normalise real EMR data to FHIR R4 before it reaches this proxy layer;
  the decision between building the normalisation in-house vs. using a managed service
  (e.g., Health Gorilla, 1up Health) is deferred to the planning phase.
- This service is read-only in v1; write-back to the EMR (e.g., posting clinical notes)
  is a future capability.
- EMR credentials are stored in the platform secrets store and are never present in application
  configuration files or logs.
- Patient matching across multiple EMRs (where the same patient has different IDs) is
  handled by an internal patient identifier mapping table seeded at enrolment. The mapping
  table is the authoritative source of truth; the service queries exactly the EMRs listed
  for a patient and does not attempt to detect or warn on absent mappings.
- The FHIR resource cache is backed by a shared in-memory data store. Cache entries
  are limited to records dated on or after the patient's most recent discharge date and use
  a 15-minute sliding TTL aligned with the chat session timeout.

