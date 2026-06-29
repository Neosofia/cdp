# Care Episode Service

## Why we need this service

Post-discharge care is procedure-scoped. A patient who had surgery in April and another in July is the same person on the platform, but their chats, alerts, and clinical context for each procedure must stay separate. Without a bounded care window, no service can reliably answer: *which conversations belong to this procedure versus that one?*

The Care Episode Service exists so the platform has **one authoritative place** to record procedure-scoped recoveries, attach clinical context, run the patient chat path, evaluate risk on each turn, and trigger escalation when required.

## Scope

This service owns **procedure-scoped recoveries**: opening and closing care windows, rolling clinical summary metadata beside chat, medical record content for authorised clinician views, and the **patient chat write path** — validating an active recovery, injecting authoritative interaction context, orchestrating care-assistant turns via Chat, evaluating clinical risk on each patient content message, and requesting alert delivery when severity and policy require it.

Recoveries close when authorised staff close them early. Automatic closure when the care window expires and lifecycle event emission are deferred to v2 ([FR-007](#functional-requirements), [FR-011](#functional-requirements)).

Runtime topology (which clients call which services for reads vs writes) is documented in [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md) — not in this spec.

## Client objectives

**Clinicians** want one enroll action that creates a patient account (when needed) and starts post-discharge monitoring for a procedure. They need recovery history, roster severity, and the ability to close a recovery early when care ends before expiry.

**Patients** enter through enrollment or a guided demo experience tied to a recovery. Registration must land them in the correct care window; chat and onboarding against a closed or expired recovery must fail clearly.

**Operators and compliance reviewers** need audit history on changes in v1; lifecycle event signals are deferred to v2 ([FR-011](#functional-requirements)). Logs and events must carry correlators only — not clinical narrative.

## Workflows

**Patient sends a chat message (happy path).** Given a signed-in patient with an active recovery opens or continues a thread in the CDP web application, when they send a message, then this service ensures the recovery is valid, orchestrates the care-assistant reply for that turn via Chat, returns the reply to the client promptly, evaluates risk after the turn is persisted on a background worker, and requests alert delivery when severity is high and escalation is enabled.

**Patient chat when care assistant is unavailable.** Given Chat inference is unreachable, when the patient sends a message through this service’s completions proxy, then the client receives **503** and the patient UI shows unavailable — no synthetic clinical replies.

**Risk evaluation when inference fails.** Given risk inference is unconfigured or errors, when a patient **content** completion succeeds in Chat, then the client still receives **200** with the Chat reply only (no inline `risk_evaluation`). A background worker records `failed-pending-review` for the thread summary when appropriate, and the recovery’s stored severity is unchanged until a successful evaluation.

**Enrollment opens monitoring.** Given an authorised clinician enrolls a patient for a named procedure, when no conflicting active recovery exists for that procedure, then a new recovery opens and audit history records who created it. The CDP web application orchestrates User registry create (when the patient is new) and the first care-episode create in sequence.

## Functional requirements

- **FR-001**: An authorised enrollment for a named procedure and patient opens a recovery in active status. The CDP web application creates the patient user when needed, then creates the first care episode — returning the persisted episode identity to the client.

- **FR-002**: When an active recovery already exists for the same patient and procedure, a duplicate enrollment is rejected and the existing recovery is identified so parallel care windows do not open by mistake.

- **FR-003**: When no care-window length is supplied on create, the platform default is **30 days** from the procedure date. Authorised clinicians may set a different positive integer at enrollment, new-procedure start, or when editing the active recovery.

- **FR-004**: Lookup of the active recovery for a patient returns a single active window; when several overlap, the most recently opened wins; when none exist, the caller receives a clear not-found outcome.

- **FR-005**: A patient’s recovery history lists all windows newest-first, including closed ones, with procedure reference, window dates, **care-window length in days**, status, and current severity for roster views.

- **FR-006**: Recovery detail for authorised callers includes the rolling clinical summary metadata clinicians need beside chat.

- **FR-007** *(deferred to v2)*: Recoveries past their end date close automatically on a daily schedule with reason recorded as window expired. v1 relies on clinician and operator manual close (including bulk close on the roster).

- **FR-008**: An authorised clinician may close an active recovery before its end date; the reason and actor are recorded.

- **FR-009**: An authorised operator may close an active recovery before its end date; the reason and actor are recorded.

- **FR-010**: Extending a care window after it has expired is out of scope for v1 unless explicitly specced later. Changing the configured length on an **active** recovery before expiry is allowed via enrollment edit and upsert; it does not reopen closed episodes.

- **FR-011** *(deferred to v2)*: Opening and closing a recovery emits lifecycle events whose payloads contain identifiers, procedure type, closure reason, and timestamps — not message content or other PHI. v1 records create, close, and association changes in per-service audit history only ([FR-014](#functional-requirements)).

- **FR-012**: After registration or demo onboarding completes, the recovery links to the patient’s platform identity. Registration or chat against a closed or expired recovery is rejected.

- **FR-013**: Unauthenticated or unauthorised requests are rejected before business logic runs.

- **FR-014**: Every create, close, and association change appends audit history suitable for compliance review.

- **FR-015**: When a patient chats through the CDP web application, this service performs the orchestration described in the patient chat workflow: valid recovery, thread with context, care-assistant reply via Chat, and client-visible reply. Risk evaluation and escalation run after the HTTP response on a background worker.

- **FR-016**: When severity is high and escalation is enabled, this service requests clinical alert delivery within the configured time budget on the background risk-evaluation worker. Only **`high`** outcomes trigger escalation; lower levels do not.

- **FR-017**: Medical record content shown beside chat in clinician views is stored and served by this service for authorised callers scoped to the recovery.

- **FR-018**: Patient channel clients must route **interaction create** and **completions** through this service’s chat proxy routes with a patient JWT — not through Chat directly. Thread list and message history reads are out of scope for this requirement ([001-chat-service.md](001-chat-service.md), [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md)). Paths and schemas: `openapi.json`.

- **FR-019**: Interaction create validates an active recovery, builds authoritative interaction context server-side (clients must not supply Chat context), and creates the Chat interaction. The response includes `care_episode_uuid` and `chat_interaction_uuid`.

- **FR-020**: Completions proxy forwards the caller’s patient JWT to Chat for session start and message turns. When Chat inference is unavailable, the proxy returns **503** to the client (passthrough).

- **FR-021**: After Chat persists a patient **content** completion, this service schedules clinical risk evaluation via an OpenAI-compatible completions API using an in-service prompt on a background worker. Evaluation is skipped for `session_start`, empty content, and Chat **`intervention: true`** responses.

- **FR-022**: When risk inference is unconfigured or unavailable, the completion response still returns **200** with the Chat reply only. The background worker records `failed-pending-review` for the thread summary when appropriate; the recovery’s stored `risk_level` is unchanged until a successful evaluation.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** business volume for the product engagement dashboard ([011-operational-metrics.md](011-operational-metrics.md)). At minimum, operators can count:

  - Recoveries opened (enrollments)
  - Patient chat turns completed (care-assistant reply path)
  - Escalations triggered by severity outcome
  - Recoveries closed

  HTTP latency and error rate are measured on the **DORA** dashboard, not here.

- **OR-002** *(deferred to v2)*: Lifecycle events follow the triggering change promptly ([FR-011](#functional-requirements)).

- **OR-003** *(deferred to v2)*: Automatic closure of expired recoveries is observable and skips already-closed rows idempotently ([FR-007](#functional-requirements)).

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- CDP web application: [019-cdp-web-application.md](019-cdp-web-application.md)
- Chat service spec: [001-chat-service.md](001-chat-service.md)
- Clinical risk evaluation: [010-ai-agent-service.md](010-ai-agent-service.md)
- Notification service spec: [005-notification-service.md](005-notification-service.md)
- User service spec: [018-user-service.md](018-user-service.md)
- Care Episode orchestration ADR: [0016-care-episode-as-clinical-orchestration-hub.md](../architecture/adrs/0016-care-episode-as-clinical-orchestration-hub.md)
- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
