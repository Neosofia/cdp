# Feature Specification: Bedrock AI Workbench

**Feature Branch**: `006-bedrock-ai-workbench`
**Created**: 2026-04-17
**Status**: Draft
**Input**: An AWS Bedrock environment for ML engineers and data scientists to perform
exploratory data analysis (EDA), ML model development, pre-training exploration, and
debugging. AWS Bedrock's native features are used as-is. The only data accessible in
this environment is the clean chat history database and an anonymized medical records
dataset — no PHI is accessible.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Engineer Explores Clean Chat Data with a Foundation Model (Priority: P1)

An ML engineer or data scientist accesses AWS Bedrock (via console, SDK, or notebook),
selects a Foundation Model, and runs ad-hoc inference or EDA against samples from the
clean chat history database to understand conversation patterns, plan feature engineering,
or prototype an approach.

**Why this priority**: Ad-hoc exploration against de-identified data is the primary
day-to-day workflow for the team.

**Independent Test**: Confirm an authenticated engineer can invoke a Bedrock Foundation
Model with a clean chat sample payload and receive a response; confirm no request can
reach or reference any raw PHI data store.

**Acceptance Scenarios**:

1. **Given** an engineer invokes a Bedrock model with a payload drawn from the clean
   chat DB, **When** the call completes, **Then** a valid model response is returned
   and the invocation appears in CloudWatch logs.
2. **Given** an engineer attempts to connect to the raw chat database or any PHI store,
   **When** the connection is attempted, **Then** it is denied by VPC/IAM policy.

---

### User Story 2 — Engineer Uses Bedrock for Model Development or Pre-training Planning (Priority: P2)

An ML engineer uses AWS Bedrock's native model customization or fine-tuning features
with training data sourced from the clean chat history and/or anonymized medical records
to develop or evaluate a domain-adapted model.

**Why this priority**: Model customization against domain data is the medium-term goal
of this environment.

**Independent Test**: Confirm a fine-tuning or evaluation job can be submitted to Bedrock
using an S3-staged export of clean chat samples; confirm the job completes and results
are accessible to authorized engineers.

**Acceptance Scenarios**:

1. **Given** a clean data export is staged in the designated S3 bucket, **When** an
   engineer submits a Bedrock fine-tuning or evaluation job, **Then** the job runs
   and results are accessible in the Bedrock console to authorized engineers.
2. **Given** an engineer attempts to stage data from a source outside the two approved
   data stores, **When** the pipeline runs, **Then** data movement is blocked by IAM
   policy.

---

### Edge Cases

- What happens when Bedrock service limits (token quotas, concurrent job limits) are reached?
- How are Bedrock API costs attributed across team members or projects for budget visibility?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The workbench MUST have read-only access to the clean chat history database
  and the anonymized medical records dataset; no other data stores are accessible.
- **FR-002**: AWS Bedrock is used as the managed platform as-is; no custom model-serving
  infrastructure is built as part of this feature.
- **FR-003**: Engineers access Bedrock via the AWS console, SDK, or notebook environments;
  no custom workbench UI is built.
- **FR-004**: IAM roles for workbench users MUST restrict actions to Bedrock APIs and the
  two approved data sources; all other AWS service access is denied by default. The
  workbench runs in a dedicated AWS account isolated from all production accounts.
- **FR-004a**: Engineer access MUST be provisioned via AWS IAM Identity Center (SSO)
  federated from the organization's corporate IdP; no long-lived IAM user access keys
  are permitted in the workbench account.
- **FR-005**: The clean chat history DB is accessed via a cross-account read replica
  in the workbench account; queries are read-only and the replica has no write path
  back to the production DB. Anonymized medical records are accessed from an S3 bucket
  shared cross-account from the de-identification pipeline. All data at rest is
  encrypted (RDS encryption for the replica; SSE-S3 or SSE-KMS for the S3 bucket).
- **FR-006**: All Bedrock API usage MUST be logged to CloudWatch, including model ID,
  token counts, latency, cost estimate, job ID, and full prompt/completion content.
  Cost visibility is handled via AWS Cost Explorer tags applied to workbench IAM roles
  and resources.
- **FR-007**: An SCP or IAM condition key MUST restrict `bedrock:InvokeModel` (and
  related actions) to an explicit allow-list of BAA-covered model IDs; calls to any
  model not on the allow-list MUST be denied at the API level.

### Key Entities

AWS Bedrock's native constructs (Foundation Models, Custom Models, Agents, Knowledge
Bases, Fine-tuning Jobs, Evaluation Jobs, Playgrounds) are used directly. No custom
service entities are defined for this feature.

The two external data sources this environment consumes (read-only):
- **Clean Chat History DB** — accessed via a cross-account read replica provisioned in
  the workbench AWS account; no write access or connection to the production DB.
- **Anonymized Medical Records Dataset** — sourced from the de-identification pipeline
  output bucket in S3, shared cross-account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero access to PHI data stores from any workbench IAM role, verified by
  automated IAM policy simulation tests.
- **SC-004**: 100% of `bedrock:InvokeModel` calls to non-BAA-covered model IDs are
  denied by SCP/IAM policy, verified by automated policy simulation tests.
- **SC-002**: 100% of Bedrock invocations from this environment appear in CloudWatch
  logs with model ID, token counts, latency, cost estimate, and full prompt/completion
  content, verified by sampling in automated tests.
- **SC-003**: Engineers can stage approved data and submit a Bedrock job without
  infrastructure setup steps beyond IAM role assumption.

## Assumptions

- The workbench runs in a **dedicated AWS account** separate from all production accounts;
  no production resources or PHI-adjacent services share this account.
- AWS Bedrock is provisioned with a HIPAA BAA; access to models not covered by that
  BAA is blocked at the API level via SCP/IAM condition (not left to engineer discretion).
- The workbench is an internal engineering tool; no patient or clinician users access it.
  Engineers authenticate via AWS IAM Identity Center (SSO) federated from the corporate
  IdP; no long-lived IAM user credentials exist in this account.
- Bedrock features are used as-is from AWS — no custom orchestration layer is built.
- Budget alerting for Bedrock usage is handled at the AWS account layer (Budgets +
  Cost Explorer), not within this service.
- Dataset curation and labelling tooling are out of scope; engineers consume already-
  processed exports from the clean chat service and de-identification pipeline.
- Online A/B testing of models in live production systems is out of scope for this feature.

