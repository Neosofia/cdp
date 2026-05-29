# EMR Service

## Why we need this service

Clinical chat and AI assistance only work when they sit on top of real patient context -- active medications, conditions, allergies, recent encounters, discharge instructions. Hospital systems expose that data through different EMR vendors, FHIR versions, and integration patterns. If every platform service spoke directly to each vendor, normalisation would diverge, credentials would scatter, and a change at one hospital would ripple through unrelated code paths.

The EMR Service exists as a **single vendor-agnostic facade**: callers receive canonically normalised clinical resources without knowing which upstream EMR holds the patient or which FHIR version it speaks.

## How this service fits into the platform

All platform consumers -- the AI Agent Service during risk assessment and response generation, the clinician web app when displaying context beside chat, enrolment flows that seed post-discharge care -- interact with this service rather than with EMR endpoints directly. Upstream connectivity, FHIR version translation (DSTU2, STU3, R4), and vendor protocol differences are delegated to a third-party abstraction layer or self-hosted FHIR adaptor evaluated at deploy time; vendor SDKs and proprietary formats stay behind an integration boundary.

The service is read-only in the initial version. Each tenant's EMR connection (endpoint, credentials, mapping) is configuration-driven so new hospital integrations follow a repeatable onboarding procedure without core code changes. An internal patient-to-EMR mapping table seeded at enrolment is authoritative: the service queries exactly the EMRs listed for a patient and merges or prioritises results per configured rules when a patient appears in more than one system. A shared cache scoped to records on or after the patient's most recent discharge date -- with a sliding time-to-live aligned to chat interaction length -- reduces repeated upstream load during active conversations. Write-back to the EMR remains a future capability.

## Client objectives

**AI agents** need timely, normalised medication, diagnosis, and discharge context to assess risk and compose informed replies -- without embedding vendor-specific field names or integration logic in agent code.

**Clinicians** want the same canonical patient record beside chat in the web app, presented consistently regardless of which hospital EMR sourced the data.

**Integration engineers** need to onboard a new tenant EMR through configuration and a documented standard operating procedure -- endpoint, OAuth or SMART credentials, verification -- without shipping a new application release for each hospital.

**Callers across the mesh** need graceful degradation when an upstream EMR is unavailable: structured, machine-readable errors rather than opaque failures, with partial results and explicit warnings when some FHIR resources fail validation.

**Compliance stakeholders** need every patient-record read attributed and auditable, with credentials confined to the platform secrets store -- never configuration files or logs.

## Functional requirements

- **FR-001**: The service exposes a unified internal API that returns the platform's canonical FHIR R4-based schema so callers never depend on vendor-specific shapes or identifiers outside the integration module.

- **FR-002**: At minimum, the service supports Patient, Encounter, MedicationRequest, Condition, AllergyIntolerance, Observation, and DocumentReference (discharge summary) resources. Each normalised record carries an explicit `resourceType` label so consumers and AI agents can interpret records regardless of upstream FHIR version.

- **FR-003**: Each EMR connection is configurable per tenant (endpoint URL, OAuth2 or SMART credentials, FHIR base path, status) without code changes -- multi-tenant growth depends on configuration-driven routing, not forked integrations.

- **FR-004**: Only authenticated callers with valid patient-access permission may retrieve patient records; every read produces an audit record suitable for compliance review.

- **FR-005**: When an upstream EMR is unavailable or times out, the service returns a structured error the caller can handle -- platform availability does not collapse into unhandled server errors, and upstream latency is observable separately from service logic.

- **FR-006**: When a bundle contains partially invalid FHIR resources, the service returns all successfully normalised resources and a `warnings` array identifying each omitted resource by type and FHIR id -- callers receive a partial-but-usable response instead of rejecting the entire payload.

- **FR-007**: A shared cache holds patient FHIR resources scoped to records dated on or after the patient's most recent discharge date. The cache is primed when a chat interaction starts and uses a sliding TTL refreshed on access during active chat, expiring when no interaction touches the entry within that window -- matching the conversational burst pattern without caching entire lifelong histories.

- **FR-008**: When a patient exists in more than one connected EMR, the service merges or prioritises records per configured precedence and returns a single consolidated response.

- **FR-009**: When discharge summary or broader EMR retrieval for a newly enrolled patient returns no records, the service still returns an empty-but-valid canonical response to the caller and raises a low-priority alert through the escalation platform to trigger missing-record review -- enrolment flows must not fail opaquely on absent upstream data.

- **FR-010**: When a tenant's EMR integration is removed or disabled, queries return a structured integration-not-configured error rather than a generic failure -- operators can distinguish misconfiguration from upstream outage.

- **FR-011**: The service is testable against FHIR R4 mock servers without live EMR connections so contract and integration tests do not depend on hospital sandboxes.

- **FR-012**: Per-request metrics cover upstream response time, cache hit and miss rate, and error rate by tenant and EMR integration so operators can measure integration health through platform tooling.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)). Patient context reads are auditable through dedicated access audit records rather than log payloads containing clinical content.

- **OR-001**: Operators **measure** upstream latency and availability separately from service logic errors.

- **OR-002**: EMR credentials are stored in the platform secrets store and never appear in application configuration or logs. Cache infrastructure is shared and sized for post-discharge scoped histories expected to remain small relative to full lifelong records.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- AI Agent Service: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Clinician app: [008-clinician-app.md](https://github.com/Neosofia/cdp/blob/main/specs/008-clinician-app.md)
- Chat Service: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
