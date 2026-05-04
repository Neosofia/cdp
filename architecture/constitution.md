<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0
Removed: Technology Stack & Compliance section (tech choices moved to ADRs)
Amended: Principles I, IV, VII — removed technology-specific references
Amended: Development Workflow — removed vendor-specific tooling references
Templates requiring updates:
  ✅ plan-template.md — no changes needed; principles remain intact
Deferred TODOs: none
-->

# Clinical Data Platform (CDP) Constitution

## Core Principles

### I. PHI Safety (NON-NEGOTIABLE)

Patient Health Information (PHI) MUST never be exposed to humans outside of authorised
clinical roles. PHI MAY be transmitted to AI/LLM services provided the provider operates
under a signed HIPAA Business Associate Agreement (BAA). The purpose of the
de-identification pipeline is to produce a clean copy of patient data for
human-accessible workloads — specifically debugging, observability tooling, and
preliminary model training — where PHI MUST NOT appear in logs, dashboards, or training
datasets visible to engineers. All PHI MUST be encrypted at rest and in transit using
industry-standard algorithms. AI providers CAN ONLY be used under a signed HIPAA BAA.
Role-Based Access Control (RBAC) MUST gate all human access to PHI. Every PHI access
event MUST be recorded in an immutable, tamper-evident audit log stored in the database
(see ADR-0004 for audit table patterns). Logs and metrics emitted to the observability
stack MUST NOT contain raw PHI or PII.

**Rationale**: The platform handles sensitive clinical data across coordinated care workflows.
A breach or HIPAA violation would cause irreversible patient harm and existential legal
risk. The de-identification boundary protects engineers from incidental PHI exposure
during development and operations — it is not a gate between patient data and AI
inference, which operates under the protections of the HIPAA BAA.

### II. Clinical Safety & Escalation Latency

AI risk models MUST produce structured, deterministic outputs (e.g., a binary signal or
explicit risk category) — never free-form verdicts. Any risk signal that crosses an
escalation threshold MUST result in a clinician alert delivered within **60 seconds**
end-to-end.
An on-call rotation with automated paging MUST back every escalation path. Clinical
risk logic (detection models, thresholds, escalation rules) MUST be versioned
independently of product code and MUST require documented clinical review before
any change is merged.

**Rationale**: Missed or delayed escalations in a post-discharge context can be
life-threatening. The 60-second SLA and independent versioning of clinical logic
are non-negotiable patient safety guarantees.

### III. Interoperability by Contract (FHIR R4)

All EMR/EHR integrations MUST be implemented behind a FHIR R4 abstraction layer.
No service outside the integration layer MAY contain EMR-vendor-specific logic.
Patient data ingested from any EMR MUST be normalized to a canonical internal
schema before use. The integration layer MUST be independently deployable and
testable without live EMR connections (contract mocks required).

**Rationale**: The platform targets multiple hospital systems. Locking business
logic to any single EMR vendor creates fragility and limits market reach.
The FHIR R4 abstraction layer is the boundary that keeps the rest of the system
vendor-agnostic.

### IV. Reliability & Observability

The platform MUST maintain **99.9% availability** (≤8.7 hours unplanned downtime/year).
Every service MUST emit structured logs and publish metrics to a central
observability stack. Distributed tracing MUST cover the full AI inference pipeline
from patient message ingestion to risk signal output. Alerts MUST fire within
2 minutes of any SLA or escalation-latency breach. Runbooks MUST exist for every
class of production alert. Logs MUST NOT contain raw PHI or PII including chat texts
and patient identifiers.

**Rationale**: A post-discharge care platform that is down or silent during a
patient crisis is worse than no platform. Observability is the prerequisite for
reliable on-call response and continuous improvement.

### V. Test Pyramid

Testing MUST follow a three-layer pyramid:
- **E2E tests** — a small suite covering full pipeline scenarios (patient message
  → risk assessment → clinician alert); MUST pass on every release candidate.
- **Integration tests** — MUST cover all AI model/API contracts, EMR integration
  adapter behavior, and inter-service message flows; MUST run on every PR merge.
- **Unit tests** — targeted at edge cases, hard-to-reach branches, and pure
  business logic; used where integration tests would be impractical or slow.

No PR that modifies clinical risk logic, the AI pipeline, or the escalation path
MAY be merged without corresponding integration test coverage.

**Rationale**: Full E2E coverage of every scenario is impractical and brittle;
over-reliance on unit tests misses integration failures. This pyramid optimizes
for confidence at the boundaries that matter most in a clinical system.

### VI. Trunk-Based Delivery with Feature Flags

The `main` branch MUST always be in a deployable state. All engineers MUST commit
to `main` (or short-lived branches ≤2 days) and gate incomplete features behind
feature flags. Long-lived feature branches are prohibited. Releases MUST follow a
weekly cadence with a defined regression window before production promotion. CI
gates (lint, test suite, security scan) MUST be green before any merge to `main`.

**Rationale**: A mid-size multi-squad team risks integration hell with long-lived
branches. Trunk-based development with feature flags enables safe concurrent
development, rapid hotfixing, and predictable weekly releases without feature
freeze.

### VII. Scalability by Design

All services MUST be designed for **100,000+ concurrent patients** from the first
production release. Services MUST be stateless; session and patient state MUST
live in a shared persistence layer — never in application memory. AI workloads
(risk inference, LLM interactions) MUST be processed asynchronously via a message
queue; no synchronous blocking calls in the patient-facing request path.
Multi-tenant isolation MUST be enforced at the data layer for all stores containing
patient data.

**Rationale**: Healthcare platforms cannot be re-architected at scale post-launch.
Designing for 100k patients from day one prevents the costlier incremental
re-platform that would otherwise be forced by growth.

## Technology Choices

Specific technology selections (cloud provider, database, messaging infrastructure,
AI inference providers, EMR adapters, etc.) are recorded in Architecture Decision
Records (ADRs) in `architecture/`. Technology choices are subject to change;
the principles in this constitution are not. Any technology choice that would
violate a core principle MUST NOT be adopted regardless of other merits.

## Development Workflow

**Branching**: Trunk-based development; all branches MUST merge to `main` within
2 working days; feature flags gate all incomplete work
**Release Cadence**: Weekly production releases; regression window of 1 business
day before promotion; rollback capability MUST be tested each release cycle
**Squads**: Multi-squad structure; each squad owns a service boundary and is
responsible for its runbooks and on-call rotation
**Code Review**: Every PR requires at least one peer review and one automated CI
pass (tests + lint + security scan); PRs touching clinical logic require a second
review from a designated clinical-safety reviewer
**Secrets & Credentials**: All secrets MUST be stored in a secrets management
service; no credentials in source code, environment files, or repository history
**API Versioning**: All external-facing APIs (patient-facing, clinician-facing,
EMR integration) MUST be versioned (e.g., `/v1/`); breaking changes require a
deprecation notice and a migration period of at least one release cycle

## Governance

This constitution supersedes all other documented engineering practices. Any
practice that conflicts with these principles MUST be updated to comply.

**Amendment procedure**: Amendments require (1) a written proposal explaining
the change and its rationale, (2) approval from at least two senior engineers
and the clinical safety reviewer, (3) a migration plan for affected code if
the change is breaking.

**Versioning policy**: Amendments follow semantic versioning — MAJOR for
principle removal or redefinition that breaks existing assumptions, MINOR for
new principles or material expansions, PATCH for clarifications and wording.

**Compliance review**: Each squad MUST self-certify constitution compliance in
their quarterly architecture review. The on-call engineer MUST verify constitution
alignment before promoting any release candidate.

**Runtime guidance**: See `architecture/` for living architecture decision
records (ADRs) and `.github/prompts/` for AI agent prompt configurations.

## Standards and Best Practices

Normative external standards referenced by this constitution and its ADRs. All
implementation decisions MUST be consistent with the relevant sections of these
documents unless a deviation is explicitly justified in an ADR.

| Standard | Reference | Scope |
|----------|-----------|-------|
| OAuth 2.0 Security Best Current Practice | [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700) | Token issuance, refresh token rotation, reuse detection, client authentication |
| UUID Version 7 | [RFC 9562 §5.7](https://www.rfc-editor.org/rfc/rfc9562#section-5.7) | All UUID primary keys across all services MUST use UUIDv7 (`uuid_generate_v7()` via `pg_uuidv7` extension) for time-ordered, B-tree-friendly insert locality; `gen_random_uuid()` (v4) is prohibited for primary keys |
| uv Python package manager | [ADR-0005](../../architecture/structurizr/decisions/0005-use-uv-for-python-package-management.md) | All Python services and packages MUST use `uv` for dependency management, virtual environments, and lockfiles; `pip`, `pip-tools`, `Poetry`, and `Pipenv` are prohibited |

**Version**: 1.4.0 | **Ratified**: 2026-04-16 | **Last Amended**: 2026-04-19
