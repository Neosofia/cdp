# Clinical Data Platform (CDP)

A HIPAA-compliant clinical data platform for AI-assisted care coordination, patient engagement, risk detection, and clinician escalation across SMS, web, and mobile channels.

---

## Architecture Diagram

The full interactive C4 model is rendered by Structurizr (run `docker compose -f architecture/docker-compose.yml up` and open [http://localhost:8080](http://localhost:8080)). The diagrams include a System Landscape view, Container views per domain, a Component view for each service, and two dynamic process-flow views.

![CDP Platform - System Landscape](architecture/structurizr/images/system-landscape.png)



## System Explanation

### Key Components and Services

The platform is decomposed into 15 independently deployable services, apps, and data pipelines grouped by the four domains shown in the architecture diagram above.

**Patient Engagement** — channel adapters, push notifications, alerting
- **[Patient Chat App (007)](specs/007-patient-chat-app/spec.md)** — The patient-facing app for iOS, Android, and web. Patients chat with their care team, receive AI-assisted replies, and get push notifications.
- **[SMS Service (009)](specs/009-sms-service/spec.md)** — Allows patients to participate via SMS without installing the app. Handles opt-in/opt-out compliance.
- **[Devices Service (013)](specs/013-devices-service/spec.md)** — Manages device registrations so push notifications reach the right patient or clinician on the right device, without exposing raw tokens to other services.
- **[Notification Service (005)](specs/005-notification-service/spec.md)** — When a high-risk message is detected, gives logged-in clinicians 60 seconds to self-assign before escalating to on-call via PagerDuty.

**Clinical Workflow** — clinician tools, patient records, care episodes, EMR
- **[Clinician App (008)](specs/008-clinician-app/spec.md)** — The clinician-facing web app. Shows the live escalation queue, patient chat transcripts, EMR context, and lets clinicians take over from the AI, send replies, and rate session quality.
- **[Patient Service (012)](specs/012-patient-service/spec.md)** — The authoritative record for patient identity. Patients are registered via invite only. Every access is audit-logged for HIPAA compliance.
- **[Care Episode Service (015)](specs/015-care-episode-service/spec.md)** — Groups a patient, procedure, and all associated conversations into a single care episode. Answers the question "which chats belong to which procedure?" and is the root object for invites, chat history, and EMR context.
- **[EMR Service (004)](specs/004-emr-service/spec.md)** — Provides a unified view of patient records from any connected hospital system, so clinicians see relevant clinical context alongside the chat.

**AI & Data Platform** — risk evaluation, deidentification, clean chat store
- **[AI Risk Agent (010)](specs/010-ai-agent-service/spec.md)** — Evaluates every patient message for clinical risk in the background without slowing down the chat. A high-risk signal triggers the clinician notification flow.
- **[Deidentification Pipeline (002)](specs/002-deidentification-pipeline/spec.md)** — After a chat session ends, strips all patient-identifying information so the conversation can be safely used for research and model improvement. Failed sessions are held for review, never silently passed through.
- **[Clean Chat Service (003)](specs/003-clean-chat-service/spec.md)** — Stores de-identified chat sessions for internal analysis and model training. No raw patient data is accessible here.
- **[Bedrock AI Workbench (006)](specs/006-bedrock-ai-workbench/spec.md)** — An isolated environment where ML engineers can experiment with de-identified data and improve the AI models. Has no connection to live patient data or production systems.

**Platform Core** — chat ingestion, authentication, API gateway
- **[Chat Service (001)](specs/001-chat-service/spec.md)** — Receives and stores all messages across every channel, streams AI replies back to patients in real time, and triggers risk evaluation and deidentification in the background.
- **[Authentication Service (014)](specs/014-authentication-service/spec.md)** — Verifies the identity of every user and service before any request is processed. Handles clinician SSO login, patient session management, and service-to-service trust.
- **[Authorization Service (016)](specs/016-authorization-service/spec.md)** — The single place where access decisions are made. Every service asks "is this principal allowed to do this?" here rather than implementing its own rules. Fails closed if unavailable.
- **[Audit Infrastructure (017)](specs/017-audit-infrastructure/spec.md)** — Ensures every service that stores patient data maintains a tamper-evident audit trail automatically, without each team needing to build it themselves.

---

### Main Data Flows

**1. Patient sends a message (happy path)**

```
Patient → Patient Chat App → API Gateway (token introspection → Auth Service)
  → Chat Service
    → Care Episode Service: active episode lookup
    → Store message (PostgreSQL, raw PHI)
    → Bedrock (inline AI response, streamed back to patient via SSE/WebSocket)
    → Risk Eval Queue (SQS, async, non-blocking)
      → AI Risk Agent (Lambda)
        → Bedrock: risk model inference
        → if yes → Notification Service → 60s window → PagerDuty
    → Session Close Queue on interaction end
      → Deidentification Pipeline (Lambda)
        → Bedrock (PHI NLP)
        → Clean Chat Service
```

**2. Clinician handles an escalation**

```
Notification Service → Clinician Alert Queue
  → Clinician App (WebSocket subscription, live alert)
    → Clinician claims within 60s: chatService.halt_ai, open transcript
    OR
  → 60s expires unclaimed → PagerDuty → pages on-call clinician
    → Clinician opens Clinician App → transcript + EMR context (EMR Service)
    → Clinician sends reply → Chat Service → Patient Chat App
```


---

### Security Considerations

See [SECURITY.md](SECURITY.md) for platform-wide security principles covering PHI containment, identity and access, HIPAA compliance, network and transport, audit logging, and supply chain controls. Service-specific security postures (threat models, rate limits, OAuth flow detail) are documented in each service's own `SECURITY.md`.

---

### AI Integration Approach

The platform uses three distinct AI workloads, each with a different latency profile and risk posture:

| Agent | Trigger | Latency class | PHI access | Model type |
|---|---|---|---|---|
| **AI Response Agent** | Every inbound message (inline) | Real-time, streamed | Yes (HIPAA BAA) | Generative LLM on Bedrock |
| **AI Risk Agent** | Every inbound message (async via SQS) | Near-real-time (< 30s queue lag) | Yes (HIPAA BAA) | Binary classification on Bedrock |
| **Deidentification Pipeline** | Session end (async via SQS) | Batch, best-effort | Yes → output is PHI-free | NLP token classification on Bedrock |

All three use AWS Bedrock as the inference provider, which allows the platform to operate under a single HIPAA BAA while maintaining flexibility to switch foundation models without infrastructure changes.

The Bedrock AI Workbench is the feedback loop: ML engineers run EDA and fine-tuning workflows on the de-identified clean chat dataset in an isolated AWS account and promote improved model versions into the production agents through a deployment pipeline. The workbench has no production access path; it consumes only approved cross-account RDS read replicas and S3 outputs.

The risk agent is explicitly decoupled from the patient-facing chat flow via SQS. This is a deliberate architectural choice: the patient's reply latency is bounded by the inline AI response path, not by the risk evaluation. A saturated risk queue does not affect patient UX.

---

### Trade-offs Considered

**Async risk evaluation vs. synchronous block**
The risk agent runs asynchronously via SQS rather than inline. This means there is a window (typically < 30 seconds) between a patient sending a high-risk message and a clinician being paged. The trade-off: synchronous evaluation would add 1–5 seconds to every patient message, a noticeable UX degradation affecting 100% of messages to protect against a risk signal that appears in a small fraction. The 30-second near-real-time SLA was judged acceptable given that the 60-second early-intervention window and PagerDuty escalation provide a backstop. I'm concerned about inference costs with a per chat message frequency. Need to do additional cost analysis to determine if more optimization is needed to avoid budget overruns.

**PHI in the Chat Service, de-identified clone in the Clean Chat Service**
Maintaining two parallel stores doubles storage costs and operational complexity. The alternative — storing only de-identified messages — would prevent the AI Response and Risk agents from operating on full clinical context (violating patient safety). Storing only raw messages would prevent any internal ML or analytics workload without HIPAA controls on every access. The two-store model keeps PHI access strictly bounded to services operating under HIPAA BAA, while giving ML engineers, data scientists, and product analytics a safe, unrestricted workspace. I'm considering dropping the clean chat service in favor of strong DLP controls in the Bedrock Workbench/Sagemaker environment.

**Invite-gated patient registration**
Patients can only register with a clinician-issued invite token linked to a specific care episode. This prevents self-signup (which would create unlinked patient records with no clinical context) and ensures every patient record is anchored to a care episode from day one. The trade-off is operational friction: a clinician must take an explicit action before a patient can onboard, which is the intended workflow for a post-discharge care model. I'm strongly considering making self signup and linking a v1 feature.

**PostgreSQL for chat message storage, and S3 for media attachments**
PostgreSQL is the current choice for the Chat Service because it is the team's highest-familiarity relational store and provides strong ACID guarantees needed for the atomic message + audit-log write (FR-009). However, chat messages have an access pattern that PostgreSQL is not optimally suited for: append-only writes, time-ordered reads by session, and bulk export by care episode at session end. Purpose-built alternatives worth evaluating in a future iteration include DynamoDB (predictable single-digit-millisecond reads at scale, native time-ordered sort keys per session) or Apache Cassandra (wide-column model naturally fits per-patient, per-session message streams at very high write throughput). Either would require rebuilding the bulk-export and cross-tenant query paths that currently rely on SQL joins.

Chat threads will also need to support rich media — images, audio recordings, and video clips sent by patients or clinicians. Storing binary blobs in PostgreSQL is an anti-pattern at scale. The intended approach is to store media in S3 (a separate PHI-scoped bucket, encrypted with KMS, access-logged via CloudTrail) and write only the S3 object key and MIME type as fields on the `Message` record. Pre-signed URLs with short TTLs are issued at read time so the client fetches media directly from S3 without proxying through the Chat Service. This pattern is not yet reflected in the Chat Service spec and represents a known gap before any media-capable client is shipped.

**WorkOS for clinician auth**
The Auth Service delegates human authentication to WorkOS rather than building credential management in-house. This defers hospital SSO (SAML/OIDC federation) and MFA to a vendor with proven healthcare IAM experience. The trade-off is a third-party dependency on the authentication critical path; this is mitigated by vendor qualification SOPs to ensure SLAs to meet our needs.

---

## Engineering Considerations

### Developer Velocity

**Service boundaries and contracts**
Each of the 10 services has an independently deployable spec, owns a clearly bounded set of entities, and exposes a narrow API surface. A developer working on the SMS Service does not need to understand the Deidentification Pipeline's model. Teams can develop, test, and deploy services in parallel with minimal coordination overhead.

**Contract-first API design**
All inter-service calls are HTTPS with JSON. FastAPI's automatic OpenAPI schema generation means each service self-documents its contract. Mock servers can be derived from the OpenAPI spec, enabling consumer services to develop against mocks before a provider service is complete.

**Isolated test environments**
The queue-based architecture (SQS) means integration test environments can use LocalStack for queues and a local Postgres instance without AWS credentials. The Bedrock dependency can be mocked at the FastAPI layer. The Devices Service's KMS encryption can be shimmed in test with a local key provider.

**Spec-driven development**
All 10 services have specs with Given/When/Then acceptance scenarios before any implementation begins. Each scenario maps directly to an integration test case. Developers start with a failing test suite and make it green, rather than writing tests after the fact.

**Architecture Decision Records**
Significant architectural choices are captured as numbered ADRs in [`architecture/structurizr/decisions/`](architecture/structurizr/decisions/). Each ADR records the context, the decision, and the consequences. Once accepted, an ADR is immutable — superseding it requires a new ADR. This gives new contributors an auditable trail of *why* the system is built the way it is, not just *what* it does. The C4 model and ADRs together form the governance layer for the platform.

**Trunk-based development**
All services use trunk-based development: engineers commit directly to `main` (or merge short-lived feature branches within a day or two) behind feature flags. This keeps integration continuous, eliminates long-lived merge conflicts, and means the `main` branch is always in a releasable state. Combined with independently deployable services, a team can ship a change to the SMS Service to production without touching any other service's release.

**Deployment independence**
Each service is containerised (see `architecture/docker-compose.yml` for local orchestration). CI/CD pipelines deploy services independently. A change to the Risk Agent does not require coordinated deployment with the Chat Service.

### How AI Tools Could Accelerate Development

**Spec-to-scaffold generation**
The specs contain entity definitions, acceptance scenarios, and functional requirements in structured natural language. An AI coding assistant can generate FastAPI route stubs, Pydantic models, and SQLAlchemy schemas directly from the spec with high accuracy, reducing the time from spec to working skeleton from days to hours.

**Test generation from acceptance scenarios**
Each User Story has Given/When/Then scenarios expressed consistently. These map 1:1 to pytest test functions. AI tools can generate the full test suite from the spec before implementation begins, enabling test-first development at near-zero cost.

**PHI-safety linting**
A custom AI-assisted linting step can scan service code for patterns that would log, return, or store raw message content or device tokens outside the permitted services. This acts as a continuous guard against accidental PHI leakage that is hard to catch in code review.

**Model iteration in the Workbench**
ML engineers can use Bedrock's native tooling (Bedrock Studio, notebook environments) with the de-identified chat dataset to iterate on the risk model and deidentification quality without writing infrastructure code. Model evaluation, prompt engineering, and fine-tuning all happen in the isolated Workbench account, then a model version reference is promoted to production through a single config change in the Risk Agent.

**Operational runbook generation**
The Operational Metrics service (011) manages AlertRules and RunBooks. AI tools can draft initial runbook steps from the alert firing conditions and the spec's edge cases, giving on-call engineers a starting point that matches the system's actual failure modes.

### How the System Could Evolve Over Time

**Multi-tenancy and enterprise onboarding**
The data model includes `tenant_id` on all core entities from day one. Adding a new hospital system is a configuration-only operation in the EMR Service (new FHIR endpoint + credentials). Auth Service can federate with a hospital's existing identity provider via WorkOS SAML support when enabled.

**Additional channels**
The channel adapter pattern (SMS Service is one implementation) means new channels — voice IVR, WhatsApp, in-patient-portal messaging — are additive. Each adapter normalises its channel-specific protocol into the same internal message format and calls the Chat Service ingestion API. No changes to the Chat Service, Risk Agent, or any downstream service are required.

**Richer clinical intelligence**
The AI Risk Agent today returns a binary yes/no. The architecture supports a graduated risk scoring model, per-condition specialised agents (cardiac, orthopaedic, oncology), and multi-turn conversation context without changing the SQS event contract. Model improvements flow from the Workbench through a deployment pipeline with no patient-facing downtime.

**Patient-initiated care episodes**
Today, care episodes are clinician-initiated. The Care Episode Service is designed to accept EMR-triggered auto-enrolment in a future iteration: when a discharge event arrives from the EMR (via a FHIR subscription), an episode is created automatically and an invite is dispatched without a clinician manually triggering it. This is additive — existing clinician-initiated flows are unchanged.

**Outcome measurement and research**
The Clean Chat Service holds a growing de-identified corpus linked to care episodes and procedure types. As this dataset matures, it enables outcome analysis (e.g., patients with high chat engagement have lower readmission rates), risk model improvement (false positive/negative rates by condition), and anonymised research data exports. The Bedrock Workbench is already the designated home for these workflows.

**Horizontal scale**
All services are stateless FastAPI workers behind the API Gateway; horizontal scaling is a container count change. The SQS-based async paths scale Lambda concurrency independently of the synchronous API path. The main scaling constraint is the Chat Service PostgreSQL database; read replicas, connection pooling (PgBouncer), and eventual read/write splitting address this as patient volume grows beyond the initial 100k target.

---

## Local Development

```bash
docker compose -f docker-compose.dev.yml up -d
```

See [OPERATIONS.md](OPERATIONS.md) for prerequisites, per-service rebuild commands, and instructions for adding new services to the local gateway. For service-specific setup (environment variables, seed data, WorkOS configuration), see the service docs in the relevant service repository.
