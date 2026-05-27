## Feature Specification: Bedrock AI Workbench

**Feature Branch**: `006-bedrock-ai-workbench`
**Created**: 2026-04-17
**Status**: Draft
**Input**: A managed AI model development environment (e.g., AWS Bedrock) for ML engineers and data scientists to perform
exploratory data analysis (EDA), ML model development, pre-training exploration, and
debugging. The platform's native features are used as-is. The only data accessible in
this environment is the clean chat history database and an anonymized medical records
dataset — no PHI is accessible.

### User Scenarios & Testing

#### User Story 1 — Engineer Explores Clean Chat Data with a Foundation Model (Priority: P1)

An ML engineer or data scientist accesses the AI model development workbench (via console, SDK, or notebook),
selects a Foundation Model, and runs ad-hoc inference or EDA against samples from the
clean chat history database to understand conversation patterns, plan feature engineering,
or prototype an approach.

**Why this priority**: Ad-hoc exploration against de-identified data is the primary
day-to-day workflow for the team.

**Independent Test**: Confirm an authenticated engineer can invoke a foundation model
with a clean chat sample payload and receive a response; confirm no request can
reach or reference any raw PHI data store.

**Acceptance Scenarios**:

1. **Given** an engineer invokes a foundation model with a payload drawn from the clean
   chat DB, **When** the call completes, **Then** a valid model response is returned
   and the invocation appears in the platform audit log.
2. **Given** an engineer attempts to connect to the raw chat database or any PHI store,
   **When** the connection is attempted, **Then** it is denied by network and access policy.

---

#### User Story 2 — Engineer Uses Bedrock for Model Development or Pre-training Planning (Priority: P2)

An ML engineer uses the workbench's native model customization or fine-tuning features
with training data sourced from the clean chat history and/or anonymized medical records
to develop or evaluate a domain-adapted model.

**Why this priority**: Model customization against domain data is the medium-term goal
of this environment.

**Independent Test**: Confirm a fine-tuning or evaluation job can be submitted to the workbench
using a staged export of clean chat samples; confirm the job completes and results
are accessible to authorized engineers.

**Acceptance Scenarios**:

1. **Given** a clean data export is staged in the designated data staging bucket, **When** an
   engineer submits a model fine-tuning or evaluation job, **Then** the job runs
   and results are accessible in the workbench console to authorized engineers.
2. **Given** an engineer attempts to stage data from a source outside the two approved
   data stores, **When** the pipeline runs, **Then** data movement is blocked by access policy.

---

#### Edge Cases

- What happens when workbench service limits (token quotas, concurrent job limits) are reached?
- How are workbench costs attributed across team members or projects for budget visibility?

### Requirements

#### Functional Requirements

- **FR-001**: The workbench MUST have read-only access to the clean chat history database
  and the anonymized medical records dataset; no other data stores are accessible.
- **FR-002**: The AI model development platform is used as-is; no custom model-serving
  infrastructure is built as part of this feature.
- **FR-003**: Engineers access the workbench via the platform console, SDK, or notebook environments;
  no custom workbench UI is built.
- **FR-004**: Access control roles for workbench users MUST restrict actions to model inference APIs and the
  two approved data sources; all other access is denied by default. The
  workbench runs in a dedicated account isolated from all production accounts.
- **FR-004a**: Engineer access MUST be provisioned via the organization's identity provider (SSO);
  no long-lived service account access keys are permitted in the workbench account.
- **FR-005**: The clean chat history DB is accessed via a cross-account read replica
  in the workbench account; queries are read-only and the replica has no write path
  back to the production DB. Anonymized medical records are accessed from a data staging bucket
  shared from the de-identification pipeline. All data at rest is
  encrypted (database encryption for the replica; server-side encryption for the staging bucket).
- **FR-006**: All model invocations MUST be logged to the platform audit log, including model ID,
  token counts, latency, cost estimate, job ID, and full prompt/completion content.
  Cost visibility is handled via cost attribution tags applied to workbench access roles
  and resources.
- **FR-007**: A platform-level access policy MUST restrict model invocation actions
  to an explicit allow-list of BAA-covered model IDs; calls to any
  model not on the allow-list MUST be denied at the API level.

#### Key Entities

The AI model development workbench's native constructs (Foundation Models, Custom Models, Agents, Knowledge
Bases, Fine-tuning Jobs, Evaluation Jobs, Playgrounds) are used directly. No custom
service entities are defined for this feature.

The two external data sources this environment consumes (read-only):
- **Clean Chat History DB** — accessed via a read replica provisioned in
  the workbench account; no write access or connection to the production DB.
- **Anonymized Medical Records Dataset** — sourced from the de-identification pipeline
  output, shared into the workbench environment.

### Success Criteria

#### Measurable Outcomes

- **SC-001**: Zero access to PHI data stores from any workbench access role, verified by
  automated access policy simulation tests.
- **SC-004**: 100% of model invocation calls to non-BAA-covered model IDs are
  denied by platform-level access policy, verified by automated policy simulation tests.
- **SC-002**: 100% of model invocations from this environment appear in the platform audit log
  with model ID, token counts, latency, cost estimate, and full prompt/completion
  content, verified by sampling in automated tests.
- **SC-003**: Engineers can stage approved data and submit a Bedrock job without
  infrastructure setup steps beyond IAM role assumption.

### Assumptions

- The workbench runs in a **dedicated account** separate from all production accounts;
  no production resources or PHI-adjacent services share this account.
- The AI model development platform is provisioned with a HIPAA BAA; access to models not covered by that
  BAA is blocked at the API level via platform-level access policy (not left to engineer discretion).
- The workbench is an internal engineering tool; no patient or clinician users access it.
  Engineers authenticate via the organization's identity provider (SSO);
  no long-lived service account credentials exist in this account.
- The workbench platform's features are used as-is — no custom orchestration layer is built.
- Budget alerting for workbench usage is handled at the account layer (budget tracking +
  cost attribution), not within this service.
- Dataset curation and labelling tooling are out of scope; engineers consume already-
  processed exports from the clean chat service and de-identification pipeline.
- Online A/B testing of models in live production systems is out of scope for this feature.
