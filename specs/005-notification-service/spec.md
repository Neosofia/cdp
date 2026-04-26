# Feature Specification: Notification Service

**Feature Branch**: `005-notification-service`
**Created**: 2026-04-17
**Status**: Draft
**Input**: A thin shim service that receives structured escalation alerts from the AI agent
service and makes a single outbound API call to PagerDuty to trigger an incident.
All routing, deduplication, escalation policy, and fallback logic is owned by PagerDuty.
Must satisfy the Constitution's 60-second end-to-end escalation SLA **measured from the
moment the early-intervention window expires** (i.e. the 60-second portal self-assignment
window is not included in this SLA — see FR-001a).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — AI Agent Triggers a Clinician Escalation Alert (Priority: P1)

The AI agent service identifies a high-risk signal in a patient's messages and calls the
notification service to escalate. Before triggering PagerDuty, the notification service
holds the alert for a 60-second **early-intervention window** during which logged-in
clinicians may self-assign the session via the clinician portal. If no clinician claims
the session within 60 seconds, the service creates a PagerDuty incident, routes it to
the correct on-call clinician for that patient's organisation, and confirms delivery within
60 seconds of the window expiry.

**Why this priority**: This is the core patient safety function. Missed or delayed alerts
can result in patient harm. This is the only user story that satisfies the Constitution's
Principle II escalation SLA.

**Independent Test**: Submit a synthetic high-severity alert payload; verify the notification
service holds the alert and does NOT call PagerDuty for 60 seconds. Simulate no portal
claim; verify PagerDuty is called within 60 seconds of window expiry. Separately simulate
a clinician claiming the session within the window; verify PagerDuty is never called for
that alert.

**Acceptance Scenarios**:

1. **Given** the AI agent service submits a high-severity escalation event, **When** the
   notification service receives it, **Then** a 60-second early-intervention window is
   started and no PagerDuty call is made during this period.
2. **Given** the 60-second window expires with no clinician self-assignment, **When** the
   window closes, **Then** a PagerDuty API call is made within 60 seconds of window expiry
   and the result (success or failure) is logged.
3. **Given** a clinician self-assigns the session via the portal within the 60-second window,
   **When** the assignment is confirmed, **Then** the alert is marked `claimed` and no
   PagerDuty call is made.
4. **Given** the PagerDuty API call fails, **When** the error is received, **Then** the
   service logs the failure, emits a failure metric, and returns an error to the caller.
   Retry and fallback behavior is owned by PagerDuty's escalation policies.
5. **Given** an inbound alert payload is malformed or missing required fields, **When**
   the service receives it, **Then** a 400 response is returned immediately, the sanitized
   payload is logged, and a `malformed_alert` metric counter is incremented.

---

### User Story 2 — Clinician Acknowledges an Alert *(DEFERRED — out of scope)*

This user story required ingesting PagerDuty lifecycle webhooks to track acknowledgement
and resolution status. **The notification service is strictly outbound-only** (it sends
requests to PagerDuty; it does not receive events from PagerDuty). Alert status
synchronization via polling or a future webhook receiver is deferred to a later spec.

---

### User Story 3 — Alert Routing by Organization *(DEFERRED — handled by PagerDuty)*

PagerDuty owns routing, escalation policies, and on-call schedules natively. This service
passes a single configured PagerDuty integration key; all routing decisions are made
inside PagerDuty. Per-tenant routing configuration is a PagerDuty administration task,
not a feature of this service.

---

### Edge Cases

- **Malformed payload**: Return 400, log sanitized payload, increment `malformed_alert` counter.
- **PagerDuty 429**: Log the rate-limit response, emit a failure metric, return error to caller. Backoff/retry is the caller's responsibility.
- **SLA monitoring**: Each alert's window-expiry timestamp and PD call timestamp are logged; a metric alert fires if the gap between window expiry and PagerDuty call exceeds 60 seconds. The 60-second early-intervention window itself is explicitly excluded from SLA measurement.
- Alert storm throttling is out of scope; no per-tenant rate limiting is required.
- Inbound PagerDuty webhook events are out of scope; the service is strictly outbound-only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST accept structured escalation events from the AI agent service
  via an internal-only API.
- **FR-001a**: On receiving an escalation event, the service MUST start a 60-second
  early-intervention window and publish the alert to the clinician portal queue. During
  this window, the service MUST NOT call PagerDuty. If a clinician self-assigns the session
  before the window expires, the alert MUST be marked `claimed` and PagerDuty MUST NOT be
  called. If the window expires unclaimed, the service MUST proceed to FR-002.
- **FR-002**: For every unclaimed escalation event (window expired), the service MUST make
  an outbound PagerDuty API call within 60 seconds of the window-expiry timestamp. The
  60-second early-intervention window is explicitly excluded from SLA measurement.
- **FR-003**: Inbound payloads MUST be validated against a defined schema; invalid payloads
  MUST be rejected with HTTP 400 before any PagerDuty call is made.
- **FR-004**: Every outbound PagerDuty call and its result (success or failure) MUST be
  logged as a structured audit log entry, including the alert ID, origin timestamp,
  call timestamp, and PagerDuty response status.
- **FR-005**: The service MUST expose a metrics endpoint reporting: alert volume, call
  latency (median and P99), and failure rate.
- **FR-006**: The escalation SLA (60 seconds) MUST be tracked per alert; breaches MUST
  trigger an operational alert to the platform on-call.
- **FR-007**: Alert payloads MUST NOT contain raw PHI; only patient identifiers (internal
  IDs) and structured risk signal labels are transmitted to PagerDuty.

### Key Entities

- **EscalationAlert**: Alert ID, patient ID (internal UUID — opaque reference, never a PII
  value, to maintain PII integrity across third-party systems), session ID, tenant ID,
  alert type (e.g., `medication-risk`, `crisis-signal`), severity, origin timestamp,
  window expiry timestamp (origin + 60s), status (`pending` / `claimed` / `escalating` /
  `delivered` / `failed`), claiming clinician ID (if claimed), PagerDuty incident ID
  (if escalated), call timestamp.

*Note: Deduplication, routing rules, and alert lifecycle (acknowledged/resolved) are
managed entirely within PagerDuty and are not modelled in this service.*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 99.9% of unclaimed escalation alerts result in a successful PagerDuty API
  call within 60 seconds of window expiry. The 60-second early-intervention window is
  excluded from this SLO.
- **SC-002**: Zero raw PHI values appear in any data transmitted to PagerDuty, verified by
  automated payload inspection tests.
- **SC-003**: Call latency (origin timestamp → PagerDuty response) is tracked per-alert
  with P99 latency visible in the metrics dashboard.

## Assumptions

- A single PagerDuty integration key is used for v1; multi-key or per-tenant key selection
  is deferred to a future version.
- PagerDuty API keys are stored in AWS Secrets Manager; no credentials appear in code or
  configuration files. Keys are rotated on an annual basis or when a data breach into the
  notification service occurs.
- The AI agent service is responsible for determining whether a risk signal warrants
  escalation; this service is strictly an outbound alert delivery mechanism — it makes
  one API call to PagerDuty and logs the result.
- All routing, deduplication, escalation policy, on-call scheduling, and fallback logic
  is owned entirely by PagerDuty configuration, not this service.
- The 60-second SLA is measured from the **window-expiry timestamp** (origin + 60s), not
  from the origin timestamp. The early-intervention window is a deliberate hold and is
  excluded from SLA measurement by design.
- Clinician-facing acknowledgement, resolution, and all alert lifecycle transitions are
  handled inside PagerDuty directly and are not tracked by this service.
- PHI is never sent to PagerDuty; the incident payload contains only the patient's
  internal UUID, alert type, and a link to the platform for the clinician to view
  details after authentication.
