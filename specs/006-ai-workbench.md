# AI Workbench

## Why we need this environment

The platform's clinical AI capabilities improve only when ML engineers and data scientists can explore conversation patterns, prototype models, and evaluate fine-tuning approaches against domain-relevant data. That work cannot happen against live production databases holding PHI. Engineers need a managed model-development environment with access to **de-identified** platform data -- clean chat history and anonymized medical records -- while network and access policy block every other data store.

The AI Workbench exists as that controlled sandbox: foundation-model inference, fine-tuning jobs, evaluation runs, and notebook-style exploration through the provider's console, SDK, or notebook environments. No custom model-serving layer or bespoke workbench UI is built as part of this feature.

## How this environment fits into the platform

Production patient chat flows through the Chat Service and related agents; session-end de-identification produces exports consumed downstream. The workbench reads from two approved sources only: a **read-only cross-account replica** of the clean chat history database, provisioned in the workbench account with no write path back to production, and an **anonymized medical records dataset** staged from the de-identification pipeline output. Every other production datastore, raw chat database, and PHI-adjacent service is unreachable by network and IAM policy.

The environment runs in a **dedicated account** isolated from all production accounts. Engineers authenticate through the organisation's identity provider (SSO); long-lived service-account access keys are not permitted. Model invocation is restricted to an explicit allow-list of BAA-covered model identifiers; calls to any other model are denied at the API level. All invocations are logged to the platform audit trail with model id, token counts, latency, cost estimate, and full prompt/completion content for accountability and spend visibility.

This is an internal engineering tool. Patients and clinicians do not access it. Online A/B testing in live production, dataset labelling tooling, and custom orchestration layers are out of scope.

## Client objectives

**ML engineers and data scientists** want to run ad-hoc inference and exploratory analysis against representative de-identified samples, submit fine-tuning or evaluation jobs, and inspect results in the provider console -- without provisioning infrastructure or negotiating one-off data exports.

**Platform security and compliance** need certainty that no workbench role can reach PHI stores, that only BAA-covered models are invokable, that engineer access is SSO-backed with no static keys, and that every model call is auditable.

**Platform operators** need cost attribution across engineers and projects via tags on roles and resources, plus account-level budget alerting -- not a custom billing UI inside the workbench.

**Downstream AI services** benefit indirectly: prototypes validated here inform production agent and model choices without coupling the workbench to live patient traffic.

## Functional requirements

- **FR-001**: The workbench has read-only access to the clean chat history database and the anonymized medical records dataset. No other data stores are accessible; connection attempts to raw chat, production databases, or PHI stores are denied by network and access policy.

- **FR-002**: A managed AI model development platform is used as-is. No custom model-serving infrastructure or orchestration layer is built for this feature.

- **FR-003**: Engineers access the workbench through the provider console, SDK, or notebook environments. No custom workbench UI is built.

- **FR-004**: Access-control roles restrict engineers to model inference APIs and the two approved data sources; all other actions are denied by default. The workbench account is dedicated and isolated from production accounts.

- **FR-005**: Engineer access is provisioned via the organisation's identity provider (SSO). Long-lived service-account access keys are not permitted in the workbench account.

- **FR-006**: The clean chat history database is accessed via a cross-account read replica in the workbench account. Queries are read-only and the replica has no write path to the production database. Anonymized medical records are read from a data staging bucket shared from the de-identification pipeline. Data at rest is encrypted (database encryption for the replica; server-side encryption for the staging bucket).

- **FR-007**: All model invocations are logged to the platform audit log, including model id, token counts, latency, cost estimate, job id, and full prompt/completion content. Cost visibility is supported through cost-attribution tags on workbench access roles and resources.

- **FR-008**: A platform-level access policy restricts model invocation to an explicit allow-list of BAA-covered model identifiers. Calls to models not on the allow-list are denied at the API level rather than left to engineer discretion.

- **FR-009**: Engineers may stage approved exports and submit fine-tuning or evaluation jobs using the provider's native job and model primitives. Data movement from sources outside the two approved stores is blocked by access policy.

## Operational requirements

- **OR-001**: Platform operators can **measure** workbench usage and cost through account-level budget tracking, cost-attribution tags, and audit-log sampling. Thresholds and budget alerts live in operational tooling, not in this spec.

- **OR-002**: Automated access-policy simulation verifies that no workbench role can reach PHI data stores and that non-BAA-covered model invocations are denied. These checks run as part of platform compliance verification.

- **OR-003**: The workbench platform is provisioned under a HIPAA BAA. Dataset curation and labelling tooling, online production A/B testing, and engineer-facing cost dashboards beyond provider and account defaults are out of scope for this feature.

## Further reading

- Clean chat service spec: [003-clean-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/003-clean-chat-service.md)
- De-identification pipeline spec: [002-deidentification-pipeline.md](https://github.com/Neosofia/cdp/blob/main/specs/002-deidentification-pipeline.md)
- AI risk agent service spec: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Audit infrastructure: [017-audit-infrastructure.md](https://github.com/Neosofia/cdp/blob/main/specs/017-audit-infrastructure.md)
