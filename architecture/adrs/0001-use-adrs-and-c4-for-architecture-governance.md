# 01. Use ADRs and C4 Modeling for Specification and Architecture Governance

Date: 2026-04-19

## Status

Accepted

## Context

The Clinical Data Platform is a safety-critical, multi-service system operating under HIPAA and clinical-safety constraints. Decisions made early in the design process — about system boundaries, data flows, and integration patterns — have long-lived consequences that are difficult to reverse. The team needed a lightweight but disciplined governance approach that:

- Makes architectural intent explicit and traceable
- Keeps diagrams and specifications in sync with implementation
- Supports AI-assisted development without losing human accountability
- Is auditable by clinical, security, and compliance stakeholders

## Decision

Adopt two complementary practices as the governance foundation for CDP:

1. **Architecture Decision Records (ADRs)** — Every significant architectural choice is recorded as a numbered ADR in `architecture/adrs/`. ADRs capture context, decision, and consequences. Once accepted, an ADR is immutable; superseding it requires a new ADR.

2. **C4 Model (Structurizr DSL)** — The architecture is expressed as a living C4 model in `architecture/structurizr/workspace.dsl`. System context, container, component, and dynamic views are generated from a single source of truth and kept in sync with the feature specs. The README, constitution, feature specs, and ADRs are embedded in the workspace via `!docs` and `!adrs` directives.

## Consequences

- Every architectural decision has a durable, auditable, and version controlled record
- New contributors can understand system intent by reading specs and diagrams before touching code
- Specs in `specs/` and the constitution in `architecture/constitution.md` remain the contract for service behavior; divergence must be justified and documented
- The C4 model must be updated whenever a service boundary, container, or significant component relationship changes
- AI-assisted code generation is bounded by spec and constitution constraints, reducing drift
