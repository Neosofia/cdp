# Clinical Data Platform (CDP) Constitution

## Core Principles

### I. PHI & Privacy

Patient Health Information (PHI) is among the most sensitive data we handle.
PHI MUST only be accessible to authorised clinical roles and the systems that
process it under appropriate legal and contractual safeguards. When patient
data leaves the core clinical boundary, it MUST be de-identified so that it
cannot be used to identify individual patients. One organisation's patient data
MUST NOT be available to another.

**Rationale**: The platform exists to support patient care. Any exposure or
commingling of PHI would harm patients, violate trust, and breach legal
requirements. Safeguarding PHI is the foundation of the entire platform.

### II. Clinical Safety & Escalation

Clinical risk decisions MUST be reliable, explainable, and constrained to
well-defined outputs. Escalation pathways MUST be rapid, predictable, and owned
by clinical stakeholders. Changes to clinical risk logic require explicit clinical
review before they affect production. Safety-critical behavior MUST be validated
through real care workflows and handoffs between systems, not isolated components
alone.

**Rationale**: The platform supports care decisions after discharge. Safety is
measured by timely, trustworthy escalation and confidence that the whole path
works for patients -- not by the complexity of the implementation.

### III. Open Healthcare Ecosystem

The platform MUST work across the diverse hospital and clinic systems our
customers already use. Core clinical logic MUST NOT depend on a single vendor's
EMR or require rewriting the product for each integration.

**Rationale**: Healthcare customers use diverse systems. Locking the platform to
one vendor would limit who we can serve and force risky rewrites as customer
environments change.

### IV. Trustworthy Operation

The platform MUST be dependable in production. Operators MUST be able to tell
when it is unhealthy and respond before patient care is affected. Improvements
and fixes MUST reach production through a safe, reviewable path -- not rare,
high-risk releases that leave known problems in place.

**Rationale**: In a clinical context, downtime, blind spots, and blocked fixes
can directly affect patient safety. Dependability and timely delivery of change
are conditions for safe operation.

## Governance

This constitution states the platform's enduring principles. If something
conflicts with a principle, name it in the PR, fix the artifact first, and
[amend](#amendments) this document only when the principle needs to evolve.
Clinical risk and escalation changes need explicit clinical review before
production (Principle II).

Format and document-tree rules:
[Documentation gold standards — Constitution](https://neosofia.tech/resources/guides/documentation/).

## Amendments

Open a PR against `architecture/constitution.md`. Say what changed and why,
@-mention prior authors of the sections you edit, and get one approval before
merge. Typo-only edits use normal review.