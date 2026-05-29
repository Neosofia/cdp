# Platform Observability

## Why we need this capability

A distributed care platform fails in ways no single service log can explain: the risk agent lagged, the notification shim retried, the SMS adapter queued an undelivered reply -- and a clinician escalation arrived sixty-two seconds late. Without a **platform-wide observability layer**, each team would instrument differently, patient-safety SLIs would be argued per service, and nobody could reconstruct an end-to-end trace from message receipt to pager delivery. Operators would fly blind; clinical safety reviewers could not prove the escalation guarantee is met; and Information Security could not independently verify that PHI never leaked into broadly accessible dashboards.

Platform Observability is not one microservice's logging feature -- it is the **shared contract** for structured events, derived metrics, trace correlation, alerting, and read-only dashboards across every service in the mesh. Services emit facts; the observability stack aggregates, measures, alerts, and reports -- always without patient-identifiable content in events, metric labels, or dashboard rows.

## How this capability fits into the platform

Every platform service emits structured JSON lifecycle events through the standard log plugin, validated against the shared log schema at emission time. Events carry opaque identifiers (patient, session, care episode, trace), tenant scope, and non-sensitive payload fields -- never names, contact details, clinical narrative, or message body text. A central aggregator ingests events, retains raw history for investigation, derives SLIs and engagement aggregates, evaluates alert rules, and exposes query APIs for engineers and dashboards for operators, clinical leads, and product teams.

Patient-safety paths are first-class: risk agent invocation latency and error rate, escalation end-to-end latency from alert raised to notification delivered, and silence detection when a service stops emitting during active care hours. Product and quality signals -- satisfaction ratings, AI response quality trends, active care episodes -- are tenant-scoped aggregates with no patient-level rows. Multi-tenant isolation applies to every query and dashboard view.

Prevention of PHI in logs is enforced in CI before deploy and verified independently by Information Security through a third-party SIEM -- the authoritative audit control, with engineering-side validation as defence in depth.

## Client objectives

**On-call engineers** need alerts that fire within minutes when patient-safety SLIs breach, when the risk agent goes silent, or when error rates spike -- each alert carrying current value, threshold, affected tenant, trace correlator, and a runbook link so remediation starts immediately rather than after log archaeology.

**Clinical safety reviewers** need weekly and on-demand reports proving the escalation path met its end-to-end time guarantee, with breach rows showing which hop introduced delay -- measurement is the only way to verify a constitutional patient-safety obligation continuously.

**Information Security** needs to ingest production-equivalent events into a third-party SIEM and run standard data-classification scans with zero PHI, PII, or SPII findings -- without relying on engineering's prior knowledge of what was logged.

**Product managers** need tenant-scoped engagement dashboards: active care episodes, message volume by channel, interaction completion, and anonymised satisfaction rates -- enough signal to steer product decisions without access to individual patient rows.

**Clinical leads** need AI quality dashboards aggregating clinician thumbs-up/down ratings and comments on closed sessions, with trends over time and links into read-only transcripts for follow-up review and model-improvement feedback batches.

**Service authors** need one supported emission path, schema validation at write time, and the ability to register new event types without redeploying the aggregator -- so observability keeps pace as the mesh grows.

## Functional requirements

- **FR-001**: All platform services emit structured JSON log events to the platform log aggregator through the standard log plugin. Direct calls to the aggregator API outside the plugin are not supported.

- **FR-002**: The log plugin validates every event against the shared platform log schema at emission time and rejects malformed events before they reach the aggregator. Rejected events are written to a local dead-letter stream for investigation.

- **FR-003**: PHI, PII, and SPII do not appear in any log event, metric label, or dashboard value. Patient references use opaque internal UUIDs only. CI security scans flag code paths that could emit identifying fields before production deploy; a third-party SIEM performs independent post-ingestion classification as the authoritative control.

- **FR-004**: The aggregator retains raw log events for operator investigation and derives platform SLIs on per-tenant and platform-wide bases. Derived aggregates are retained longer than raw events for trend reporting. Retention durations are configured in operational tooling.

- **FR-005**: The platform derives and publishes SLIs including, at minimum:

  - Message ingestion latency (received to stored)
  - Risk agent invocation latency, error rate, invocation rate, escalation rate, and suppression rate
  - Escalation alert end-to-end latency (alert raised to notification delivered)
  - Queue publish latency at interaction end
  - AI response agent latency and model inference latency
  - Rate-limit rejection rate
  - Patient satisfaction and AI response quality rates (thumbs-up, thumbs-down, unrated)
  - EMR sync latency and stalled-sync detection
  - SMS delivery failure rate
  - Counts of active care episodes and active chat interactions

  Specific threshold values and evaluation windows are configured in operational tooling; this spec defines **what** must be measurable, not the numeric SLO catalogue.

- **FR-006**: When a configured SLI breaches its threshold, the aggregator raises an alert through the platform escalation path within a bounded propagation time. Alert payloads include SLI name, current value, threshold, affected tenant when tenant-scoped, trace correlator, and runbook URL.

- **FR-007**: A versioned runbook exists for every alert rule and is linked from alert payloads. Runbooks are maintained alongside operational configuration.

- **FR-008**: Every event carries trace and span identifiers; the aggregator reconstructs the ordered event chain for a given trace on demand and supports queries by trace, chat interaction, or care episode identifier.

- **FR-009**: Engagement and quality dashboards expose tenant-level aggregates only -- no patient-level rows. Queries for one tenant do not expose another tenant's data.

- **FR-010**: The aggregator detects service silence: when a service that historically emits events produces none for a configurable quiet-period threshold during expected active hours, a silence alert fires.

- **FR-011**: New service event types are registerable without redeploying the aggregator (schema registry or equivalent extension model).

- **FR-012**: Services document their emitted event types in their own specs; the shared log schema in `schemas/` is the authoritative envelope definition. Event naming follows `<service>.<entity>.<action>` convention.

## Operational requirements

- **OR-001**: Platform operators can **deploy** the observability stack (aggregator, alert rules, dashboards, retention policies) independently of individual service releases, and can tune thresholds without service code changes.

- **OR-002**: Operators can **measure** alert propagation time, trace reconstruction latency, retention compliance, and multi-tenant query isolation through automated checks in staging and production.

- **OR-003**: Clock skew across emitting services is bounded by infrastructure time synchronisation; event ordering for analysis uses event timestamps, not ingest order.

- **OR-004**: Peak event throughput across all services and tenants is supported without a separate message-queue ingest layer at initial scale; capacity planning revisits this assumption as volume grows.

## Relationship to platform baseline

Spec [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md) states what every emitter must produce; this spec defines how those events are aggregated, measured, alerted on, and displayed.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)

- Structured log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
- Structured logging ADR: [0009-structured-json-logging-with-schema-validation.md](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0009-structured-json-logging-with-schema-validation.md)
- Chat service spec: [001-chat-service.md](https://github.com/Neosofia/cdp/blob/main/specs/001-chat-service.md)
- AI risk agent service spec: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Notification service spec: [005-notification-service.md](https://github.com/Neosofia/cdp/blob/main/specs/005-notification-service.md)
- SMS service spec: [009-sms-service.md](https://github.com/Neosofia/cdp/blob/main/specs/009-sms-service.md)
