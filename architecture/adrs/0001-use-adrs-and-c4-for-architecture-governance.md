# 1. Use ADRs and C4 Modeling for Specification and Architecture Governance

Date: 2026-04-17

## Status

Accepted

## Context

The Clinical Data Platform is a safety-critical, multi-service system operating under HIPAA and clinical-safety constraints. Decisions made early in the design process — about system boundaries, data flows, and integration patterns — have long-lived consequences that are difficult to reverse. The team needed a lightweight but disciplined governance approach that:

- Makes architectural intent explicit and traceable
- Keeps diagrams and specifications in sync with implementation
- Supports AI-assisted development without losing human accountability
- Is auditable by clinical, security, and compliance stakeholders

## Decision

Adopt three complementary practices as the governance foundation for CDP:

1. **Architecture Decision Records (ADRs)** — Every significant architectural choice is recorded as a numbered ADR in `architecture/structurizr/decisions/`. ADRs capture context, decision, and consequences. Once accepted, an ADR is immutable; superseding it requires a new ADR.

2. **Structured specification workflow** — All feature work begins with a structured specification and planning workflow (`specify → clarify → plan → tasks → implement`). Each service has a canonical `spec.md` under `specs/NNN-service-name/`. The constitution (`/architecture/constitution.md`) encodes non-negotiable platform principles that all specs must comply with.

3. **C4 Model (Structurizr DSL)** — The architecture is expressed as a living C4 model in `architecture/structurizr/workspace.dsl`. System context, container, component, and dynamic views are generated from a single source of truth and kept in sync with the feature specs. Documentation and ADRs are embedded in the workspace via `!docs` and `!decisions` directives.

## Consequences

- Every architectural decision has a durable, auditable, and version controlled record
- New contributors can understand system intent by reading specs and diagrams before touching code
- Specs serve as the contract between design and implementation; divergence from a spec must be justified and documented
- The C4 model must be updated whenever a service boundary, container, or significant component relationship changes
- AI-assisted code generation is bounded by spec and constitution constraints, reducing drift
