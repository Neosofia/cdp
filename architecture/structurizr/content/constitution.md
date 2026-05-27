## Clinical Data Platform (CDP) Constitution

### Core Principles

#### I. PHI Safety (NON-NEGOTIABLE)

Patient Health Information (PHI) is among the most sensitive data we handle.
PHI MUST only be accessible to authorised clinical roles and the systems that
process it under appropriate legal and contractual safeguards. When patient
data leaves the core clinical boundary, it MUST be de-identified so that it
cannot be used to identify individual patients.

**Rationale**: The platform exists to support patient care. Any exposure of PHI
outside authorised pathways would harm patients, violate trust, and breach legal
requirements. Safeguarding PHI is the foundation of the entire platform.

#### II. Clinical Safety & Escalation

Clinical risk decisions MUST be reliable, explainable, and constrained to
well-defined outputs. Escalation pathways MUST be rapid, predictable, and owned
by clinical stakeholders. Changes to clinical risk logic require explicit clinical
review and clear governance before they affect production.

**Rationale**: The platform supports care decisions after discharge. Safety is
measured by timely, trustworthy escalation, not by the complexity of the
implementation.

#### III. Interoperability by Contract

EMR/EHR integrations MUST be isolated behind a stable abstraction. The platform
must avoid embedding vendor-specific logic outside the integration boundary.
Patient data should be normalized to a canonical internal form so that business
logic remains vendor-agnostic and easier to maintain.

**Rationale**: Healthcare customers use diverse systems. A contract-based
integration boundary preserves flexibility and reduces long-term operational risk.

#### IV. Reliability & Observability

The platform MUST be dependable and transparent in production. Availability,
error detection, and operational visibility are core attributes, not optional
extras. Teams must be able to understand whether the platform is healthy and
respond quickly when it is not.

**Rationale**: In a clinical context, downtime or blind spots can directly affect
patient safety. Reliability and observability are the conditions for safe
operation.

#### V. Layered Quality Assurance

Quality assurance should be layered so that the system is validated at the
appropriate scope: broad scenario coverage, integration boundaries, and focused
business logic. This is how we build confidence without relying on a single type
of test.

**Rationale**: Clinical systems require both high-level confidence and localized
precision. A layered approach balances those needs.

#### VI. Continuous Delivery Discipline

The primary development line MUST remain deployable. Changes should be
integrated frequently, with small batches of work and deliberate review. This
reduces risk, enables faster feedback, and makes releases predictable.

**Rationale**: Frequent integration and small changes reduce the chance of
surprise failures in a multi-team environment.

#### VII. Scalability by Design

The platform must be capable of supporting meaningful scale from the outset.
Services should favor stateless design where appropriate, ensure patient-facing
work is resilient, manage state intentionally when it exists, and enforce tenant
boundaries consistently.

**Rationale**: Healthcare platforms are costly to re-architect after launch.
Designing for scale early preserves future options and protects operational
stability.

### Architecture & Governance References

This constitution is the highest-level statement of platform principles. Any
practice, decision, or implementation that conflicts with these principles must
be re-evaluated and brought back into alignment, or the principles must be
amended.

For more detail on how these principles apply to our product, refer to the
ADRs and specs that guide the design, implementation, testing, and delivery of
this system.

- [architecture/adrs/](/workspace/1/decisions) — Architecture Decision Records capture the
  platform's architectural decisions, governance rationale, and approved
  boundaries for future design choices.
- [specs/](specs/001-chat-service.md) — Service and product specifications capture contract
  expectations, API boundaries, and user-facing behavior requirements.


