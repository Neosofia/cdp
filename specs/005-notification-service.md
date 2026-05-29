# Notification Service

## Why we need this service

When the AI risk agent detects a high-severity signal in a patient conversation, someone with clinical authority must respond quickly. The platform cannot rely on clinicians watching dashboards around the clock. It needs a controlled path from an internal risk decision to an on-call clinician -- with a deliberate pause so logged-in clinicians can intervene first.

The Notification Service exists to bridge that gap. It receives structured escalation events from the AI agent service, holds each alert through a **60-second early-intervention window** so clinicians can self-assign via the portal, and -- only when no one claims the session -- makes a single outbound call to the escalation platform (for example PagerDuty) to page the on-call clinician. It is intentionally thin: routing, deduplication, escalation policy, acknowledgement, and fallback are owned by the escalation platform, not reimplemented here.

## How this service fits into the platform

The AI Risk Agent Service evaluates patient messages asynchronously and, when intervention is warranted, submits an escalation event to this service over an internal-only API. During the early-intervention window, the service publishes the alert to the clinician portal queue so any available clinician in the region can claim the session. A successful claim marks the alert as handled and **suppresses** the escalation platform call entirely.

If the window expires unclaimed, the service triggers an incident through the configured escalation platform integration key. The platform decides which on-call recipient receives the page, using organisation and schedule configuration maintained outside this service. The incident payload carries only opaque identifiers and structured risk labels -- never raw PHI -- plus a link the clinician follows after authentication to reach the alert detail view.

This service is **strictly outbound**. It does not ingest escalation platform webhooks, track acknowledgement or resolution, or model alert lifecycle beyond its own hold-and-deliver state. Those concerns stay in the escalation platform or in future specs.

## Client objectives

**Patients at risk** need a reliable safety net when AI-assisted chat surfaces a crisis or medication concern. Delayed or missed escalation can cause harm; the platform must move from risk detection to human response within bounded time after the intervention window closes.

**Clinicians already in the portal** want a fair chance to pick up borderline or lower-severity cases before an on-call page fires. The 60-second window gives them that opportunity without counting portal hold time against the constitutional escalation SLA.

**On-call clinicians** need a page that arrives quickly after the window expires, with enough context to open the right patient session -- but no PHI in the third-party incident record.

**Platform operators** need to verify that every unclaimed alert resulted in an escalation platform call (or a logged, auditable failure), that SLA measurement starts at window expiry rather than alert origin, and that malformed or unsafe payloads never reach external systems.

**The AI agent service** needs a simple, dependable handoff: submit a validated escalation event and receive a clear success or failure response without owning paging infrastructure.

## Functional requirements

- **FR-001**: The service accepts structured escalation events from the AI agent service via an internal-only API. Risk classification stays upstream; this service delivers alerts, it does not reinterpret clinical severity.

- **FR-002**: On receiving an escalation event, the service starts a 60-second early-intervention window and publishes the alert to the clinician portal queue. During this window it does not call the escalation platform. If a clinician self-assigns the session before expiry, the alert is marked claimed and no escalation platform call is made. If the window expires unclaimed, processing continues to outbound escalation.

- **FR-003**: For every unclaimed escalation event, the service makes an outbound escalation platform API call within 60 seconds of the **window-expiry timestamp**. The 60-second early-intervention window is deliberately excluded from SLA measurement -- the clock starts when the hold ends, not when the risk signal originated.

- **FR-004**: Inbound payloads are validated against a defined schema. Invalid payloads are rejected with HTTP 400 before any escalation platform call, with a sanitized record of the rejection for operator diagnosis.

- **FR-005**: Every outbound escalation platform call and its result (success or failure) is recorded as a structured audit entry, including alert id, origin timestamp, call timestamp, and escalation platform response status. Incident review needs a complete trail, not just success counts.

- **FR-006**: Alert payloads sent to the escalation platform contain only the patient's internal opaque identifier, session and tenant references, alert type, severity, and a platform link -- never raw PHI. Third-party systems must not receive names, free-text clinical content, or other identifiable values.

- **FR-007**: When the escalation platform API returns an error, the service logs the failure, emits a failure metric, and returns an error to the caller. Retry and fallback behaviour is owned by the escalation platform's policies and the caller's retry strategy, not duplicated here.

- **FR-008**: Malformed inbound payloads produce HTTP 400 immediately; sanitized payload detail is logged and a malformed-alert counter is incremented so operators can detect integration drift.

- **FR-009**: A single escalation platform integration key is used for v1; per-tenant key selection is deferred. Credentials live in the platform secrets store and are never embedded in code or configuration files.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** alert volume, hold-to-escalation timing, outbound call outcomes, and malformed submissions. At minimum:

  - Recording each alert's window-expiry timestamp and escalation platform call timestamp so the gap can be monitored
  - Classifying outbound call success and failure
  - Counting malformed inbound alerts
  - Detecting when the interval from window expiry to escalation platform call exceeds 60 seconds

- **OR-002**: Escalation platform credentials are rotated on an annual basis or promptly when a breach affecting this service occurs. Key material is managed through the platform secrets store.

- **OR-003**: Alert storm throttling, per-tenant rate limiting, and inbound escalation platform webhook ingestion are out of scope for v1. Clinician acknowledgement and resolution tracking are handled inside the escalation platform directly.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- AI risk agent service spec: [010-ai-agent-service.md](https://github.com/Neosofia/cdp/blob/main/specs/010-ai-agent-service.md)
- Clinician app (portal queue and self-assign): [008-clinician-app.md](https://github.com/Neosofia/cdp/blob/main/specs/008-clinician-app.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- API contract: [openapi.json](https://github.com/Neosofia/notification/blob/main/openapi.json)
