# Platform Baseline

## Why we need this baseline

Feature specs describe what each service, app, or environment must do for patients, clinicians, and operators. Many obligations repeat everywhere: encrypted transport, supported client platforms, PHI-safe telemetry, published API contracts, and accessible patient-facing UI. Copying the same paragraphs into eighteen documents drifts over time -- one spec pins TLS 1.2 in a functional requirement, another buries it in operations, a third omits it entirely.

The platform baseline is the **single authoritative place** for those cross-cutting requirements. Numbered specs **001–018** inherit this document by default unless they state an explicit exception. Each feature spec keeps only what is unique to that component; transport, logging shape, and contract publication live here once.

## How this baseline fits into the platform

Deployable components -- HTTP services, browser apps, mobile apps, and batch workers -- must satisfy the functional and operational requirements below in addition to anything their own spec adds. Platform Observability (spec 011) defines how events are aggregated, measured, and alerted; this baseline defines what every emitter must produce. Service-specific `SECURITY.md` files document threat models and control depth; this baseline states the non-negotiable floor.

When a feature spec's operational section opens with "platform baseline applies," the bullets that follow are **additional** measurements or deploy concerns for that component only -- not a second copy of structured logging or TLS minimums.

## Client objectives

**Service and app authors** want one checklist for transport, supported platforms, logging, and API contracts so new specs stay focused on domain behaviour.

**Platform operators** need to verify TLS version, log hygiene, and contract alignment the same way in every environment -- gateway scans, SIEM classification, and CI OpenAPI diff -- without reconciling conflicting spec prose.

**Information Security** need a single statement that PHI, PII, and SPII do not belong in logs, metrics, or client-visible error surfaces, with opaque correlators only -- reinforced by spec 011 and independent SIEM review.

**Patients and clinicians using platform apps** expect current mobile and browser versions to work, HTTPS-only API traffic, and WCAG 2.1 AA on primary interactive surfaces without each app spec redefining the same platform or accessibility bar.

## Functional requirements

- **FR-001**: Platform HTTP services refuse plaintext at the transport layer. All API traffic uses TLS end-to-end.

- **FR-002**: Browser and native client applications call platform APIs over HTTPS only. Web applications do not issue mixed-content requests.

- **FR-003**: HTTP API services publish their contract in `openapi.json` in the service repository, kept aligned with implementation so clients, gateways, and contract tests share one authoritative surface.

- **FR-004**: User-facing applications (patient, clinician, and operator experiences) meet WCAG 2.1 AA on primary interactive surfaces, including screen reader support (VoiceOver, TalkBack, and equivalent) and user-controlled font scaling where the UI renders text.

- **FR-005**: Native mobile applications support the latest two major releases of iOS and Android.

- **FR-006**: Browser-based applications function correctly on the latest two major releases of Chrome, Firefox, Safari, and Edge.

## Operational requirements

- **OR-001**: API endpoints exposed to clients and the service mesh negotiate TLS 1.2 or higher. Operators can verify minimum protocol version at the gateway or load balancer.

- **OR-002**: Every deployable component emits structured logs or telemetry through the platform logging contract (see operational-metrics spec). Payloads contain no PHI, PII, or SPII; patient and user references use opaque correlators only. Numeric SLOs and alert thresholds are configured in platform operational tooling, not in individual feature specs.

- **OR-003**: Services using the standard log plugin validate events against the shared log schema at emission time. Rejected events are handled per the operational-metrics spec (local dead-letter stream for investigation).

## Further reading

- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Structured logging ADR: [0009-structured-json-logging-with-schema-validation.md](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0009-structured-json-logging-with-schema-validation.md)
- Log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
- Platform security principles: [SECURITY.md](https://github.com/Neosofia/cdp/blob/main/SECURITY.md)
