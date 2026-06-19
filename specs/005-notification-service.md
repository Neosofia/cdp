# Notification Service

## Why we need this service

When clinical risk evaluation identifies a high-severity situation, care teams need a dependable way to deliver an alert without every clinical service operating its own email infrastructure.

The Notification Service exists as a **thin outbound relay**. In v1 it delivers clinical alert email when Care Episode requests escalation after high-severity evaluation ([010-ai-agent-service.md](010-ai-agent-service.md)). It also relays contact-form messages for the public corporate website. Paging systems, SMS, push notifications, and in-portal self-assign queues are out of scope for v1 ([ADR-0018](../architecture/adrs/0018-streamlined-v1-product-scope.md)).

## How this service fits into the platform

Care Episode evaluates risk on each patient turn and, when escalation is enabled and severity is high, hands off a structured alert request to this service. The relay validates the request, sends through the configured email provider, and reports success or failure — it does not reinterpret clinical severity.

Operators measure whether the relay and the clinical services that call it are reachable from the CDP web application health panel alongside other platform services. Corporate marketing contact submissions use the same relay under separate rate and origin rules.

## Client objectives

**Patients at risk** need timely human awareness when automated evaluation surfaces a crisis pattern. Delayed or failed delivery can cause harm.

**Clinical and operational staff** need alert email with enough structured context to open the correct patient workspace in the CDP web application — without unnecessary identifiable detail in third-party provider records.

**Care Episode** needs a simple handoff: submit a validated alert request and receive a clear success or failure outcome.

**Platform operators** need to verify relay volume, provider failures, and rejected requests through structured logs and liveness checks.

## Workflows

**Clinical alert relay (happy path).** Given Care Episode has determined that escalation is enabled and severity is high, when it submits a valid alert request to this service, then the service delivers email through the configured provider and returns success, and operators can correlate the attempt in structured logs using opaque identifiers only.

**Invalid alert request.** Given an alert request does not match the published contract, when the relay receives it, then delivery is not attempted, the caller receives a clear rejection, and operators can count the rejection without logging clinical narrative from the payload.

## Functional requirements

- **FR-001**: The service relays validated outbound email requests to the configured destination inbox. Message content is supplied by the caller; this service validates shape, delivers through the configured provider, and reports success or failure. Clinical alert wording is composed upstream ([015-care-episode-service.md](015-care-episode-service.md)); this service does not evaluate clinical severity.

- **FR-002**: Requests that do not match the published contract are rejected before any provider call.

- **FR-003**: Every delivery attempt — success or failure — is recorded in structured logs using correlators only, never raw clinical narrative from upstream payloads.

- **FR-004**: Upstream callers govern how much identifiable or clinical detail appears in relayed email. This service does not add patient names, chat text, or other clinical narrative beyond what the caller supplies in the validated request.

- **FR-005**: When the provider cannot deliver, the service reports failure to the caller and records the outcome for operators. Whether and when to retry is decided by the caller unless product policy adds shared replay later.

- **FR-006**: Provider credentials are stored in the platform secrets store and are never embedded in application source or committed configuration.

- **FR-007**: The service exposes liveness and version information so operators can confirm reachability, including from the CDP health panel.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** relay volume, provider failures, and rejected requests. At minimum:

  - Classifying delivery success and failure
  - Counting malformed inbound requests
  - Attributing duration of delivery attempts

- **OR-002**: Provider credentials are rotated on an annual basis or promptly when a breach affecting this service occurs.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Clinical risk evaluation: [010-ai-agent-service.md](010-ai-agent-service.md)
- Care Episode Service: [015-care-episode-service.md](015-care-episode-service.md)
- Streamlined v1 scope ADR: [0018-streamlined-v1-product-scope.md](../architecture/adrs/0018-streamlined-v1-product-scope.md)
- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
- API contract: [openapi.json](https://github.com/Neosofia/notification/blob/main/openapi.json)
- Operator verification: [INSTALLATION_PLAN.md](https://github.com/Neosofia/notification/blob/main/INSTALLATION_PLAN.md)
