# Platform Observability

## Why we need this capability

A distributed care platform fails in ways no single service log can explain: the notification relay retried, enrollment stalled, or chat activity dropped while HTTP error rates looked fine. Without a **platform-wide observability layer**, each team would instrument differently, growth numbers would be argued per service, and nobody could reconstruct an end-to-end trace from patient message to alert attempt. Operators would fly blind; product and executive stakeholders could not report adoption trends; and Information Security could not independently verify that PHI never leaked into broadly accessible dashboards.

Platform Observability is the **shared contract** for structured events, log aggregation, trace correlation, and read-only dashboards — always without patient-identifiable content in events, metric labels, or dashboard rows. Services emit facts; **Grafana Cloud Loki** (via Locomotive from Railway) is the central log store for staging and production.

## Two dashboards, two audiences

| Dashboard | Audience | Purpose |
|-----------|----------|---------|
| **Reliability (DORA)** | DevOps, on-call engineers | HTTP error rate, p95 latency, unhandled errors, auth failures — service health and release confidence |
| **Product engagement** | Product, clinical ops, executives | Raw **counts** and **growth** over weeks and quarters — enrollments, chat activity, logins, escalations, clinician participation |

Engineering SLOs (latency percentiles, error rates, silence detection) belong on **DORA**, not the business dashboard. Business dashboards show **what happened** (volume), not **how fast** (milliseconds).

## How this capability fits into the platform

Every platform service emits structured lifecycle events through the standard log plugin, validated against the shared log schema at emission time. Events carry opaque identifiers, tenant scope, and non-sensitive payload fields — never names, contact details, clinical narrative, or message body text. Loki ingests events, retains raw history for investigation, and supports LogQL aggregates for dashboards. Long retention supports quarter-over-quarter growth views.

Prevention of PHI in logs is enforced before deploy and verified independently by Information Security through a third-party SIEM — the authoritative audit control, with engineering-side validation as defence in depth.

## Client objectives

**Product managers and executives** need tenant-scoped engagement dashboards with cumulative counts and trend lines suitable for board and investor review: enrollments, active usage (logins), patient chat turns, care-assistant replies, clinician participation, and clinical escalations — no patient-level rows.

**Clinical leads** need escalation **volumes** over time for follow-up review with clinical stakeholders.

**On-call engineers** use the **DORA** dashboard and alerts for error rate, latency, unhandled exceptions, and auth failures — each alert carrying current value, threshold, affected tenant when relevant, trace correlator, and a runbook link.

**Clinical safety reviewers** need on-demand trace reconstruction showing when high-severity turns triggered alert attempts and whether delivery succeeded or failed.

**Information Security** needs to ingest production-equivalent events into a third-party SIEM and run standard data-classification scans with zero PHI, PII, or SPII findings.

**Service authors** need one supported emission path, schema validation at write time, and registerable event types without redeploying Loki.

## Workflows

**Trace a patient chat escalation.** Given a high-severity turn triggered alert delivery, when an operator queries by shared trace correlator, then the observability stack reconstructs the ordered event chain from patient message through evaluation to alert attempt without exposing message text in dashboard rows.

**Review quarterly growth.** Given an executive opens the product engagement dashboard with a 90-day or longer range, when the view loads, then they see total enrollments, chat turns, logins, and escalations for the period plus trend lines for month-over-month comparison — all tenant-scoped when a tenant filter is applied.

## Functional requirements

- **FR-001**: All platform services emit structured log events through the standard log plugin to stdout; Locomotive forwards Railway log streams to Loki. Direct calls to Loki outside the standard emission path are not supported.

- **FR-002**: The log plugin validates every event against the shared platform log schema at emission time and rejects malformed events before they reach the aggregator. Rejected events are written to a local dead-letter stream for investigation.

- **FR-003**: PHI, PII, and SPII do not appear in any log event, metric label, or dashboard value. Patient references use opaque internal identifiers only.

- **FR-004**: Loki retains raw log events for operator investigation. Business engagement aggregates are derived via LogQL from structured `event_type` fields (preferred) or documented HTTP path proxies where events are not yet emitted. Retention must support multi-week and quarterly trend reporting.

- **FR-005**: The **product engagement** dashboard derives and publishes **business measures** including, at minimum:

  | Measure | What it answers | Preferred signal |
  |---------|-----------------|------------------|
  | Patient enrollments | How many patients started monitoring? | `user_provisioning_succeeded`, `episode.opened` |
  | Successful logins | How many people used the product? | `authentication_success` |
  | Patient chat turns | How many patient messages received an AI reply? | `chat.turn_completed` or CE `/completions` edge count |
  | Care-assistant replies | How much AI-assisted care was delivered? | Same as chat turns in v1 (one reply per turn) |
  | Clinician messages | How often did the care team participate? | `message.stored` with `direction=clinician` or Chat POST `/messages` count |
  | Clinician response rate | What share of patient turns got a human follow-up? | Clinician messages ÷ patient chat turns (same period) |
  | Clinical escalations | How many high-severity alerts fired? | `escalation.triggered` or notification clinical relay count |
  | Recoveries closed | How many care windows ended? | `episode.closed` |

  Panels show **counts** and **period totals** (not latency). Default time ranges support weekly, monthly, and quarterly review.

- **FR-006**: The **DORA** dashboard publishes **reliability measures** including, at minimum: edge HTTP error rate, edge p95 latency, unhandled application errors, authentication failure rate, and HTTP request rate by service. CDP Admin health panel covers per-service `/health` reachability.

- **FR-007**: When a configured **reliability** measure breaches its threshold, Grafana raises an alert with measure name, current value, threshold, trace correlator when available, and runbook link.

- **FR-008**: Every event carries trace and span identifiers where the request path supports them; operators can reconstruct the ordered event chain for a given trace in Loki Explore.

- **FR-009**: Engagement dashboards expose tenant-level aggregates only — no patient-level rows. Queries for one tenant do not expose another tenant's data.

- **FR-010**: The aggregator detects service silence: when a service that historically emits events produces none for a configurable quiet-period threshold during expected active hours, a silence alert fires (DORA / Grafana alerting).

- **FR-011**: New service event types are registerable without redeploying Loki.

- **FR-012**: Services document business-relevant event types in their own specs; the shared log schema in the schemas repository is the authoritative envelope definition.

## Operational requirements

- **OR-001**: Platform operators can **deploy** dashboards (OpenTofu in `infrastructure/public-cloud/grafana/`), Loki ingest (Locomotive), alert rules, and retention policies independently of individual service releases.

- **OR-002**: Operators can **measure** alert propagation time, trace reconstruction in Explore, retention compliance, and multi-tenant query isolation through automated checks in staging and production.

- **OR-003**: Clock skew across emitting services is bounded by infrastructure time synchronisation; event ordering for analysis uses event timestamps, not ingest order.

- **OR-004**: Peak event throughput across all services and tenants is supported without a separate message-queue ingest layer at initial scale.

## Relationship to platform baseline

Spec [000-platform-baseline.md](000-platform-baseline.md) states what every emitter must produce; this spec defines how those events are aggregated, measured, and displayed. Per-service specs define which business events each component emits ([015-care-episode-service.md](015-care-episode-service.md), [001-chat-service.md](001-chat-service.md), [014-authentication-service.md](014-authentication-service.md), [005-notification-service.md](005-notification-service.md)).

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Grafana dashboards: [infrastructure/public-cloud/grafana/README.md](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/grafana/README.md)
- Structured log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
- Structured logging ADR: [0009-structured-json-logging-with-schema-validation.md](../architecture/adrs/0009-structured-json-logging-with-schema-validation.md)
- Chat service spec: [001-chat-service.md](001-chat-service.md)
- Care Episode service spec: [015-care-episode-service.md](015-care-episode-service.md)
- Clinical risk evaluation spec: [010-ai-agent-service.md](010-ai-agent-service.md)
- Notification service spec: [005-notification-service.md](005-notification-service.md)
- CDP web application spec: [019-cdp-web-application.md](019-cdp-web-application.md)
