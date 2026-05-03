# Feature Specification: Operational Metrics

**Feature Branch**: `011-operational-metrics`
**Created**: 2026-04-17
**Status**: Draft
**Input**: Platform-wide observability — aggregated structured log events from all services,
derived metrics, SLIs/SLOs, alerting thresholds, and operational dashboards. No PHI or PII
may appear in any log event, metric, or dashboard.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — On-Call Engineer Detects an Alert Agent Anomaly (Priority: P1)

An on-call engineer receives an escalation platform alert (e.g., PagerDuty) that the AI Alert agent invocation latency
has spiked above its p99 threshold during active care hours. They open the operational
dashboard, see the latency trend, correlate with an AI model inference error spike, and begin
remediation using the runbook linked from the alert. A separate alert fires when the
invocation rate drops unexpectedly — indicating the agent has silently stopped processing
new messages.

**Why this priority**: The AI Alert agent is the primary patient-safety mechanism on the
platform — it detects clinical risk signals in patient messages and triggers clinician
escalations. Latency spikes delay escalations; errors or traffic drops mean risk signals
are missed entirely. Both conditions directly threaten patient safety.

**Independent Test**: In staging, (a) inject artificial latency into the AI inference provider and
verify a latency-spike alert fires within 2 minutes; (b) stop alert agent invocations for
5 minutes and verify a silence alert fires; (c) inject a burst of invocations 3× the
baseline rate and verify an abnormal-traffic alert fires.

**Acceptance Scenarios**:

1. **Given** alert agent invocation latency p99 exceeds the SLA threshold for one evaluation
   window, **When** the alerting rule evaluates, **Then** a P1 escalation platform alert fires within
   2 minutes with the current p99 value, threshold, and a runbook link.
2. **Given** no `agent.alert.triggered` events are received for 5 consecutive minutes during
   a window with active care episodes, **When** the silence rule evaluates, **Then** a P1
   alert fires within 2 minutes.
3. **Given** the alert agent invocation rate exceeds 3× the rolling 1-hour baseline,
   **When** the anomaly rule evaluates, **Then** a P2 alert fires flagging abnormal traffic.
4. **Given** any `agent.alert.*` invocation returns an error, **When** the error-rate rule
   evaluates and the 5-minute error rate exceeds the threshold, **Then** a P1 alert fires.

---

### User Story 2 — Clinician Alert SLA Is Reported Weekly (Priority: P1)

The clinical safety reviewer pulls the weekly SLA report and verifies that 100% of
escalation alerts reached a clinician within 60 seconds end-to-end. Any breach is
highlighted with a trace showing which service introduced the latency.

**Why this priority**: The 60-second escalation SLA is a Constitution Principle II
patient-safety guarantee. Measurement and reporting are the only way to verify it is
being met continuously.

**Independent Test**: Inject 100 synthetic escalation events end-to-end; verify the SLA
report shows each event's latency, breach status, and the service responsible for any
latency outlier.

**Acceptance Scenarios**:

1. **Given** escalation events have been processed in the reporting window, **When** the
   weekly SLA report is generated, **Then** it shows per-event latency, the percentage
   meeting the 60-second SLA, and any breach with a trace ID.
2. **Given** an escalation event breaches the 60-second SLA, **When** the breach is
   detected, **Then** a real-time alert fires within 2 minutes identifying the lagging
   service.

---

### User Story 3 — Information Security Independently Verifies No PHI/PII/SPII Leaks into Logs (Priority: P1)

The Information Security team uses a third-party SIEM to independently verify that no log
event, metric label, or dashboard value contains patient-identifiable data (PHI, PII, or
SPII). All patient references in events must use opaque internal UUIDs only. This audit is
independent of engineering — the platform must produce logs that pass SIEM inspection
without any prior knowledge of their content by the InfoSec team.

**Why this priority**: The observability stack is broadly accessible. PHI, PII, or SPII in
logs would constitute a HIPAA violation and violates Constitution Principle I. Independent
verification by InfoSec via a third-party SIEM is the authoritative control — the
platform's own PHI scanner (FR-003) is a defence-in-depth measure, not the audit control.

**Independent Test**: InfoSec ingests a representative sample of production-equivalent log
events into the third-party SIEM and runs its standard data-classification scan; zero events
are flagged as containing PHI, PII, or SPII.

**Acceptance Scenarios**:

1. **Given** a sample of log events from all platform services ingested into the third-party
   SIEM, **When** InfoSec runs the data-classification scan, **Then** zero events are
   classified as containing PHI, PII, or SPII.
2. **Given** a new service emits events for the first time, **When** its events are ingested
   by the log aggregator, **Then** the platform's automated PHI-pattern check (FR-003) runs
   and alerts if any known patterns are detected — providing an early signal ahead of the
   next InfoSec SIEM audit.

---

### User Story 4 — Product Team Reviews Patient Engagement & Satisfaction Metrics (Priority: P2)

A product manager opens the engagement dashboard and sees aggregate counts of active care
episodes, message volume by channel, interaction completion rates, and patient satisfaction
scores (thumbs up/down captured at chat session end) — all anonymised and tenant-scoped —
to inform product decisions.

**Why this priority**: Product decisions require data. Aggregated, de-identified counts and
satisfaction signals are safe to surface to non-clinical stakeholders and do not require PHI
access.

**Independent Test**: Verify that engagement and satisfaction metrics aggregate correctly for
a known synthetic dataset and that no patient-level data is exposed — only tenant-level
aggregates.

**Acceptance Scenarios**:

1. **Given** a set of care episodes with known message counts and interaction ratings,
   **When** the engagement dashboard is queried, **Then** it returns correct tenant-level
   aggregates — including thumbs-up rate and thumbs-down rate — with no patient-level rows.
2. **Given** a tenant has no active episodes, **When** the dashboard is queried,
   **Then** it returns zero-values rather than omitting the tenant row.
3. **Given** interactions have ended with a rating submitted, **When** the satisfaction
   metrics are aggregated, **Then** the dashboard shows thumbs-up %, thumbs-down %, and
   unrated % for the selected time window and tenant.

---

### User Story 5 — Clinical Lead Reviews AI Response Quality Ratings (Priority: P1)

A clinical lead opens the AI quality dashboard and reviews the aggregate thumbs-up/down
ratings and verbatim comments that clinicians have submitted against closed chat sessions
(spec 008, User Story 3). Each rating entry links through to the originating chat session
transcript. The dashboard surfaces trends over time — thumbs-up rate, thumbs-down rate,
unrated rate, and the free-text comments — to identify systemic AI response quality issues
and drive the ML/AI model improvement cycle.

**Why this priority**: Clinicians are the authoritative reviewers of AI clinical response
quality. Aggregating their feedback into a reviewable, trend-visible dashboard is the
primary mechanism for detecting model degradation, biased outputs, or response patterns
that miss clinical nuance — none of which are detectable from latency or throughput metrics.
This data also feeds directly into the ML retraining pipeline.

**Independent Test**: Submit a known set of clinician ratings (mix of thumbs-up, thumbs-down,
with and without comments) via the clinician app; verify the quality dashboard correctly
aggregates rates, surfaces verbatim comments with session links, and trends correctly over
the reporting window.

**Acceptance Scenarios**:

1. **Given** clinician ratings have been submitted in the reporting window, **When** the
   quality dashboard is queried, **Then** it shows: total rated sessions, thumbs-up count
   and %, thumbs-down count and %, unrated %, and a chronological list of thumbs-down
   entries with their verbatim comment and a link to the chat session.
2. **Given** the thumbs-down rate exceeds a configurable threshold over a rolling window
   (default threshold: to be calibrated post-launch), **When** the anomaly rule evaluates,
   **Then** a P2 alert fires notifying the clinical lead of a potential AI quality
   degradation.
3. **Given** a clinical lead clicks a session link in the dashboard, **Then** they are
   taken directly to the read-only chat transcript in the clinician app for further review
   and comment.
4. **Given** the clinical lead adds a follow-up comment to a rated session, **When** it is
   saved, **Then** it is flagged for inclusion in the next ML/AI model feedback batch.

---

### Edge Cases

- What happens when a service is down and stops emitting events — how is a gap detected vs. a quiet period?
- How are log events deduplicated if a service retries an emission?
- What is the retention policy for raw log events vs. derived metric aggregates?
- How are alert thresholds tuned to avoid alert fatigue during expected low-traffic periods (e.g., overnight)?
- What happens when a new service is added — how are its events ingested without a deployment of the aggregator?
- What happens when `emr.sync.started` fires but `emr.sync.completed` never follows — how long before a stalled sync alert fires?

## Requirements *(mandatory)*

### Log Event Schema

All services MUST emit structured JSON log events to the log aggregator. Events MUST conform
to the following base schema — no PHI or PII MAY appear in any field:

```
{
  "event_id":      "<uuid>",
  "event_type":    "<service>.<entity>.<action>",   // e.g. "chat.message.received"
  "service":       "<service-name>",
  "tenant_id":     "<uuid>",
  "timestamp":     "<ISO-8601 UTC>",
  "trace_id":      "<uuid>",
  "span_id":       "<uuid>",
  "payload":       { /* event-specific fields — no PHI */ }
}
```

Patient references in events MUST use the internal opaque patient UUID only — never name,
DOB, MRN, phone, email, or any other identifying field.

---

### Event Taxonomy by Service

#### Chat Service (spec 001)
| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `chat.message.received` | Inbound message arrives | `message_id`, `chat_interaction_id`, `care_episode_id`, `patient_id` (UUID), `channel`, `size_bytes` |
| `chat.message.stored` | Message durably written | `message_id`, `duration_ms` |
| `chat.message.rate_limited` | Message rejected (429) | `patient_id` (UUID), `channel` |
| `chat.interaction.started` | New ChatInteraction created | `chat_interaction_id`, `care_episode_id`, `patient_id` (UUID) |
| `chat.interaction.ended` | ChatInteraction ends | `chat_interaction_id`, `end_reason` (`user-closed` / `inactivity-timeout`), `duration_ms`, `message_count` |
| `chat.interaction.rated` | Patient submits thumbs up/down at session end | `chat_interaction_id`, `rating` (`thumbs_up` / `thumbs_down`) |
| `chat.care_episode.opened` | New CareEpisode created | `care_episode_id`, `patient_id` (UUID), `procedure_type`, `care_window_days` |
| `chat.care_episode.closed` | CareEpisode closes | `care_episode_id`, `closure_reason`, `closed_by_role` |
| `chat.queue.published` | Interaction-end event published to deident queue | `chat_interaction_id`, `duration_ms` |
| `chat.access.denied` | RBAC rejection | `actor_role`, `resource_type` |

#### Deidentification Pipeline (spec 002)
| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `deident.job.started` | Agent invoked for an interaction | `job_id`, `chat_interaction_id`, `message_count` |
| `deident.job.completed` | Interaction log fully processed | `job_id`, `outcome` (`clean` / `quarantine`), `duration_ms`, `model_version` |
| `deident.job.failed` | Agent error or timeout | `job_id`, `failure_reason`, `retry_count` |
| `deident.message.quarantined` | Low-confidence or failed message | `job_id`, `reason`, `confidence_score` |
| `deident.model.deployed` | New model version active | `model_id`, `model_version` |

#### Clean Chat Service (spec 003)
| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `clean_chat.message.written` | Clean message stored | `clean_message_id`, `source_job_id`, `duration_ms` |
| `clean_chat.message.rejected` | Duplicate or validation failure | `source_message_id`, `reason` |

#### EMR Service (spec 004)
| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `emr.sync.started` | Scheduled sync run begins | `sync_id`, `tenant_id`, `emr_vendor` |
| `emr.record.fetched` | Patient record retrieved from EMR | `care_episode_id`, `emr_vendor`, `duration_ms` |
| `emr.record.failed` | EMR fetch error | `care_episode_id`, `emr_vendor`, `error_code` |
| `emr.sync.completed` | Scheduled sync run completes | `sync_id`, `tenant_id`, `records_synced`, `duration_ms` |

#### Notification Service (spec 005)
| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `notification.alert.dispatched` | Clinician alert sent | `alert_id`, `channel` (`pagerduty` / `sns`), `severity` |
| `notification.alert.delivered` | Delivery confirmed | `alert_id`, `latency_ms` |
| `notification.alert.failed` | Delivery failure | `alert_id`, `channel`, `attempt_count` |
| `notification.escalation.sla_breached` | 60-second SLA missed | `alert_id`, `latency_ms`, `lagging_service` |

#### Bedrock AI Workbench (spec 006)

N/A

#### AI Agent Service (spec 010)
| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `agent.response.triggered` | AI Response agent invoked per message | `agent_invocation_id`, `message_id`, `chat_interaction_id` |
| `agent.response.completed` | Response agent finished | `agent_invocation_id`, `duration_ms`, `action_taken` |
| `agent.alert.triggered` | AI Alert agent invoked per message | `agent_invocation_id`, `message_id` |
| `agent.alert.escalated` | Alert agent raised escalation | `agent_invocation_id`, `alert_id` |
| `agent.alert.suppressed` | Below escalation threshold | `agent_invocation_id`, `confidence_score` |
| `agent.deident.triggered` | Deidentification agent invoked at interaction end | `agent_invocation_id`, `chat_interaction_id` |
| `agent.session.rated` | Clinician submits quality rating on a closed session | `agent_invocation_id`, `chat_interaction_id`, `rating` (`thumbs_up` / `thumbs_down`), `has_comment` (`true` / `false`) |
| `agent.session.comment_added` | Clinical lead adds follow-up comment to a rated session | `chat_interaction_id`, `flagged_for_ml` (`true`) |

#### SMS Service (spec 009)
| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `sms.message.sent` | Outbound SMS dispatched | `message_id`, `provider`, `size_bytes` |
| `sms.message.delivered` | Delivery receipt received | `message_id`, `latency_ms` |
| `sms.message.failed` | Delivery failure | `message_id`, `provider`, `error_code` |
| `sms.opt_out.recorded` | Patient opt-out received | `patient_id` (UUID) |

---

### Functional Requirements

- **FR-001**: All platform services MUST emit structured JSON log events to the platform log aggregator
  using the standard platform log plugin. The plugin is the sole supported emission path;
  direct calls to the log aggregator API outside the plugin are prohibited.
- **FR-002**: The standard log plugin MUST validate every event against the base schema at
  emission time and raise a hard error in the emitting service if the event is malformed.
  Malformed events MUST NOT be written to the log aggregator. The plugin MUST also write
  rejected events to a local dead-letter log (e.g., a separate log stream or stderr) for investigation.
- **FR-003**: PHI and PII MUST NOT appear in any log event. Prevention is enforced at two
  layers: (1) CI/CD pipeline security scans (static analysis) MUST flag any code path that
  could emit PHI or PII fields before it reaches production; (2) the platform's third-party
  SIEM performs independent post-ingestion analysis and is the authoritative control for
  detecting any PHI/PII that slips through. The log aggregator itself performs no runtime
  PHI scanning.
- **FR-004**: The aggregator MUST retain raw log events for a minimum of **90 days**;
  derived metric aggregates MUST be retained for a minimum of **2 years**.
- **FR-005**: The aggregator MUST derive and publish the following platform SLI metrics
  on a per-tenant and platform-wide basis:
  - **Message ingestion latency p99** (target: ≤500 ms) — from `chat.message.received` to `chat.message.stored`
  - **Alert agent invocation latency p99** *(P1 — primary patient-safety SLI)* (SLA: ≤10 s) — from `agent.alert.triggered` to `agent.alert.escalated` or `agent.alert.suppressed`
  - **Alert agent error rate** *(P1)* (SLA: ≤1% of invocations over any 5-minute window) — `agent.alert.*` invocations that return an error as a percentage of total invocations
  - **Alert agent invocation rate** *(P1)* — `agent.alert.triggered` events per minute; used to detect abnormal traffic (spike: >3× 1-hour rolling baseline; silence: zero events for 5 min during active care hours)
  - **Escalation alert end-to-end latency p99** *(P1)* (SLA: ≤60 s) — from `agent.alert.escalated` to `notification.alert.delivered`
  - **Queue publish latency p99** (target: ≤500 ms) — from `chat.interaction.ended` to `chat.queue.published`
  - **AI response agent latency p99** — from `agent.response.triggered` to `agent.response.completed`
  - **AI model inference latency p99** — from `workbench.inference.started` to `workbench.inference.completed`
  - **Rate-limit rejection rate** — `chat.message.rate_limited` events per minute per tenant
  - **Patient satisfaction rate** — thumbs-up % and thumbs-down % of rated interactions per tenant (derived from `chat.interaction.rated`; unrated interactions tracked separately as unrated %)
  - **AI response quality: thumbs-up rate** — `agent.session.rated` with `thumbs_up` as a % of all rated sessions per tenant per window
  - **AI response quality: thumbs-down rate** — `agent.session.rated` with `thumbs_down` as a % of all rated sessions per tenant per window
  - **AI response quality: unrated rate** — closed sessions with no `agent.session.rated` event as a % of total closed sessions per tenant per window
  - **Alert agent escalation rate** — `agent.alert.escalated` as a % of total `agent.alert.triggered` per tenant per window
  - **Alert agent suppression rate** — `agent.alert.suppressed` as a % of total `agent.alert.triggered` per tenant per window
  - **EMR sync latency p99** — from `emr.sync.started` to `emr.sync.completed` per tenant; stalled sync alert fires if no `emr.sync.completed` received within a configurable timeout (default: 30 minutes) of `emr.sync.started`
  - **SMS delivery failure rate** — `sms.message.failed` as a percentage of `sms.message.sent`
  - **Active care episodes** — count of open CareEpisodes per tenant
  - **Active chat interactions** — count of open ChatInteractions platform-wide
- **FR-006**: The aggregator MUST raise an alert via the escalation platform (e.g., PagerDuty) within **2 minutes** when any SLI
  breaches its defined SLA threshold. Alert payload MUST include: SLI name, current value,
  SLA threshold, affected tenant (if tenant-scoped), trace ID of the triggering event, and
  a runbook URL.
- **FR-007**: All alert runbooks MUST be versioned alongside the operational metrics spec and
  linked from alert payloads. A runbook MUST exist for every alert rule defined in this spec.
- **FR-008**: The aggregator MUST support distributed trace correlation: every event carries
  a `trace_id` and `span_id`; the aggregator MUST be able to reconstruct the full event chain
  for any given trace ID on demand.
- **FR-009**: The aggregator MUST expose a query API allowing engineers to retrieve:
  - All events for a given `trace_id`
  - All events for a given `chat_interaction_id` or `care_episode_id`
  - Aggregated SLI metric values for a given time window and tenant
- **FR-010**: Engagement dashboard aggregates MUST be tenant-scoped and MUST NOT expose
  patient-level rows — only tenant-level counts and rates.
- **FR-011**: The aggregator MUST detect service silence: if a service that has historically
  emitted events produces no events for a configurable quiet-period threshold (default:
  5 minutes during business hours), a `service.silence` alert MUST fire.
- **FR-012**: New service event types MUST be registerable without redeployment of the
  aggregator (schema registry or plug-in model).

### Key Entities

- **LogEvent**: Event ID, event type, service, tenant ID, timestamp, trace ID, span ID,
  payload (JSON, no PHI), ingest timestamp, validation status (`accepted` / `rejected`).
- **SLIMetric**: Metric name, tenant ID (or `platform`), window start, window end, value,
  SLA threshold, breach (`true` / `false`).
- **AlertRule**: Rule ID, SLI name, threshold, evaluation window, severity, runbook URL,
  enabled flag.
- **AlertFiring**: Firing ID, rule ID, fired timestamp, resolved timestamp, trace ID,
  current value, SLA threshold, tenant ID.
- **RunBook**: Runbook ID, alert rule ID, title, version, steps (markdown), last reviewed
  timestamp, owner squad.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of platform services emit structured log events conforming to the base
  schema within one sprint of this spec being implemented.
- **SC-002**: Zero log events containing PHI or PII reach the log aggregator, verified
  by: (a) CI/CD pipeline security scans flagging PHI-emitting code paths before deployment,
  and (b) third-party SIEM post-ingestion audit returning zero PHI/PII findings on a
  representative production-equivalent sample.
- **SC-003**: SLI breach alerts fire within 2 minutes of the breach condition being met,
  verified end-to-end in staging for 100% of defined alert rules.
- **SC-004**: Escalation SLA (60 seconds end-to-end) is measured and reported with ≤1-second
  measurement granularity for 100% of escalation events.
- **SC-005**: Trace reconstruction for any `trace_id` returns the complete ordered event
  chain within 5 seconds of query.
- **SC-006**: Raw event retention verified at 90 days; aggregate metric retention verified
  at 2 years by automated retention policy tests.
- **SC-007**: Service silence detection fires within 7 minutes of a service stopping event
  emission (5-minute quiet window + 2-minute alert propagation budget).
- **SC-008**: Alert agent invocation latency p99 SLA breach (>10 s) triggers a P1 escalation platform
  alert within 2 minutes, verified end-to-end in staging.
- **SC-009**: Alert agent error rate exceeding 1% over any 5-minute window triggers a P1
  alert within 2 minutes, verified by synthetic error injection in staging.
- **SC-010**: Alert agent silence (zero `agent.alert.triggered` events for 5 minutes during
  active care hours) triggers a P1 alert within 2 minutes, verified in staging.
- **SC-011**: Alert agent abnormal traffic (invocation rate >3× 1-hour rolling baseline)
  triggers a P2 alert within 2 minutes, verified by synthetic traffic burst in staging.

## Assumptions

- The log aggregator is a platform-internal service; it is not exposed externally.
- Event ingestion uses a structured log aggregation service over HTTPS;
  peak event throughput is expected to be < 100 events/sec across all services and tenants.
  No message queue ingest layer is required at this scale.
- Runbook content is authored by the owning squad and stored alongside this spec; the
  aggregator links to runbooks by URL (e.g., internal wiki or versioned markdown in the repo).
- Engagement dashboards are read-only; no write operations originate from the dashboard layer.
- Multi-tenant isolation: tenant-scoped SLI queries MUST NOT expose data from other tenants.
- Clock skew between services is assumed to be ≤100 ms (NTP-synchronized infrastructure);
  events are ordered by `timestamp` field, not ingest time.
