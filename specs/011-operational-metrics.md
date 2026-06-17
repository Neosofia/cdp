# Platform Observability

## Why we need this capability

A distributed care platform fails in ways no single service log can explain: clinical risk evaluation lagged on the patient chat path, the notification relay retried, and a clinician alert arrived late. Without a **platform-wide observability layer**, each team would instrument differently, patient-safety measures would be argued per service, and nobody could reconstruct an end-to-end trace from patient message to alert delivery. Operators would fly blind; clinical safety reviewers could not prove escalation timeliness; and Information Security could not independently verify that PHI never leaked into broadly accessible dashboards.

Platform Observability is not one microservice's logging feature — it is the **shared contract** for structured events, derived metrics, trace correlation, alerting, and read-only dashboards across every service in the mesh. Services emit facts; the observability stack aggregates, measures, alerts, and reports — always without patient-identifiable content in events, metric labels, or dashboard rows.

## How this capability fits into the platform

Every platform service emits structured lifecycle events through the standard log plugin, validated against the shared log schema at emission time. Events carry opaque identifiers, tenant scope, and non-sensitive payload fields — never names, contact details, clinical narrative, or message body text. A central aggregator ingests events, retains raw history for investigation, derives measures and engagement aggregates, evaluates alert rules, and exposes query APIs for engineers and dashboards for operators, clinical leads, and product teams.

Patient-safety paths are first-class: patient chat turn duration on the Care Episode path, escalation time from high severity to alert delivery, and silence detection when a service stops emitting during active care hours. Product signals — active recoveries, message volume, roster severity distribution — are tenant-scoped aggregates with no patient-level rows. Multi-tenant isolation applies to every query and dashboard view.

Prevention of PHI in logs is enforced before deploy and verified independently by Information Security through a third-party SIEM — the authoritative audit control, with engineering-side validation as defence in depth.

## Client objectives

**On-call engineers** need alerts that fire within minutes when patient-safety measures breach, when risk evaluation goes silent on the patient chat path, or when error rates spike — each alert carrying current value, threshold, affected tenant, trace correlator, and a runbook link so remediation starts immediately rather than after log archaeology.

**Clinical safety reviewers** need periodic and on-demand reports showing escalation timeliness, with breach rows indicating which step introduced delay — measurement is the only way to verify a constitutional patient-safety obligation continuously.

**Information Security** needs to ingest production-equivalent events into a third-party SIEM and run standard data-classification scans with zero PHI, PII, or SPII findings — without relying on engineering's prior knowledge of what was logged.

**Product managers** need tenant-scoped engagement dashboards: active recoveries, message volume, and chat activity — enough signal to steer product decisions without access to individual patient rows.

**Clinical leads** need visibility into severity trends and escalation volumes over time for follow-up review with clinical stakeholders.

**Service authors** need one supported emission path, schema validation at write time, and the ability to register new event types without redeploying the aggregator — so observability keeps pace as the mesh grows.

## Workflows

**Trace a patient chat escalation.** Given a high-severity turn triggered alert delivery, when an operator queries by shared trace correlator, then the observability stack reconstructs the ordered event chain from patient message through evaluation to alert attempt without exposing message text in dashboard rows.

## Functional requirements

- **FR-001**: All platform services emit structured log events to the platform log aggregator through the standard log plugin. Direct calls to the aggregator API outside the plugin are not supported.

- **FR-002**: The log plugin validates every event against the shared platform log schema at emission time and rejects malformed events before they reach the aggregator. Rejected events are written to a local dead-letter stream for investigation.

- **FR-003**: PHI, PII, and SPII do not appear in any log event, metric label, or dashboard value. Patient references use opaque internal identifiers only. Pre-deploy checks and independent SIEM classification provide defence in depth and authoritative audit control respectively.

- **FR-004**: The aggregator retains raw log events for operator investigation and derives platform measures on per-tenant and platform-wide bases. Derived aggregates are retained longer than raw events for trend reporting. Retention durations are configured in operational tooling.

- **FR-005**: The platform derives and publishes measures including, at minimum:

  - Patient chat turn duration on the Care Episode path (care-assistant reply and risk evaluation)
  - Risk evaluation latency, error rate, invocation rate, and escalation rate by severity outcome
  - Escalation end-to-end latency from high severity to alert delivery
  - Inference latency on care-assistant and risk paths
  - Message storage latency
  - Rate-limit rejection rate
  - Counts of active recoveries and active conversation threads
  - CDP health-panel success rate per configured platform service

  Specific threshold values and evaluation windows are configured in operational tooling; this spec defines **what** must be measurable, not the numeric SLO catalogue.

- **FR-006**: When a configured measure breaches its threshold, the aggregator raises an alert through the platform escalation path within a bounded propagation time. Alert payloads include measure name, current value, threshold, affected tenant when tenant-scoped, trace correlator, and runbook link.

- **FR-007**: A versioned runbook exists for every alert rule and is linked from alert payloads. Runbooks are maintained alongside operational configuration.

- **FR-008**: Every event carries trace and span identifiers; the aggregator reconstructs the ordered event chain for a given trace on demand and supports queries by trace, conversation thread, or recovery identifier.

- **FR-009**: Engagement dashboards expose tenant-level aggregates only — no patient-level rows. Queries for one tenant do not expose another tenant's data.

- **FR-010**: The aggregator detects service silence: when a service that historically emits events produces none for a configurable quiet-period threshold during expected active hours, a silence alert fires.

- **FR-011**: New service event types are registerable without redeploying the aggregator.

- **FR-012**: Services document their emitted event types in their own specs; the shared log schema in the schemas repository is the authoritative envelope definition.

## Operational requirements

- **OR-001**: Platform operators can **deploy** the observability stack (aggregator, alert rules, dashboards, retention policies) independently of individual service releases, and can tune thresholds without service code changes.

- **OR-002**: Operators can **measure** alert propagation time, trace reconstruction latency, retention compliance, and multi-tenant query isolation through automated checks in staging and production.

- **OR-003**: Clock skew across emitting services is bounded by infrastructure time synchronisation; event ordering for analysis uses event timestamps, not ingest order.

- **OR-004**: Peak event throughput across all services and tenants is supported without a separate message-queue ingest layer at initial scale; capacity planning revisits this assumption as volume grows.

## Relationship to platform baseline

Spec [000-platform-baseline.md](000-platform-baseline.md) states what every emitter must produce; this spec defines how those events are aggregated, measured, alerted on, and displayed.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Structured log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
- Structured logging ADR: [0009-structured-json-logging-with-schema-validation.md](../architecture/adrs/0009-structured-json-logging-with-schema-validation.md)
- Inference ADR: [0002-configurable-hipaa-inference-provider.md](../architecture/adrs/0002-configurable-hipaa-inference-provider.md)
- Chat service spec: [001-chat-service.md](001-chat-service.md)
- Care Episode service spec: [015-care-episode-service.md](015-care-episode-service.md)
- Clinical risk evaluation spec: [010-ai-agent-service.md](010-ai-agent-service.md)
- Notification service spec: [005-notification-service.md](005-notification-service.md)
- CDP web application spec: [019-cdp-web-application.md](019-cdp-web-application.md)
