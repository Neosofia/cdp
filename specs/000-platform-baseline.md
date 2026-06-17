# Platform Baseline

## Why we need this baseline

Feature specs describe what each service and the CDP web application must do for patients, clinicians, and operators. Many obligations repeat everywhere: encrypted transport, supported client platforms, safe telemetry, published API contracts, and accessible patient-facing UI. Copying the same paragraphs into every document drifts over time — one spec pins transport rules in a functional requirement, another buries them in operations, a third omits them entirely.

The platform baseline is the **single authoritative place** for those cross-cutting requirements. Numbered specs **001–020** inherit this document by default unless they state an explicit exception. Each feature spec keeps only what is unique to that component; transport, logging shape, and contract publication live here once.

## How this baseline fits into the platform

Deployable components — HTTP services and the CDP web application — must satisfy the functional and operational requirements below in addition to anything their own spec adds. Platform Observability (spec 011) defines how events are aggregated, measured, and alerted; this baseline defines what every emitter must produce. Service-specific security documents describe threat models and control depth; this baseline states the non-negotiable floor.

When a feature spec's operational section opens with "platform baseline applies," the bullets that follow are **additional** measurements or deploy concerns for that component only — not a second copy of structured logging or transport minimums.

## Client objectives

**Service and app authors** want one checklist for transport, supported platforms, logging, and API contracts so new specs stay focused on domain behaviour.

**Platform operators** need to verify transport settings, log hygiene, and contract alignment the same way in every environment without reconciling conflicting spec prose.

**Information Security** need a single statement that PHI, PII, and SPII do not belong in logs, metrics, or client-visible error surfaces, with opaque correlators only — reinforced by spec 011 and independent SIEM review.

**Patients and clinicians using the CDP web application** expect a responsive browser experience on desktop and phone-sized layouts, encrypted connections only, and accessible primary interactive surfaces without each spec redefining the same bar.

## Functional requirements

- **FR-001**: Platform HTTP services refuse plaintext at the transport layer. All API traffic uses TLS end-to-end.

- **FR-002**: The CDP web application calls platform APIs over encrypted connections only. The application does not issue mixed-content requests.

- **FR-003**: HTTP API services publish a machine-readable contract in the service repository, kept aligned with implementation so clients and contract tests share one authoritative surface.

- **FR-004**: The CDP web application meets WCAG 2.1 AA on primary interactive surfaces, including screen reader support and user-controlled font scaling where the UI renders text.

- **FR-005**: The CDP web application functions correctly on current major desktop browsers and on current mobile browsers commonly used by patients and clinicians.

- **FR-006**: Primary patient and clinician workflows remain usable from phone-width layouts through desktop without horizontal scrolling on core chat and navigation surfaces. Touch targets and navigation patterns must support phone-sized viewports because native iOS and Android applications are out of scope for v1.

## Operational requirements

- **OR-001**: API endpoints exposed to clients and the service mesh negotiate TLS 1.2 or higher. Operators can verify minimum protocol version at the gateway or load balancer.

- **OR-002**: Every deployable component emits structured logs or telemetry through the platform logging contract (see operational-metrics spec). Payloads contain no PHI, PII, or SPII; patient and user references use opaque correlators only. Numeric SLOs and alert thresholds are configured in platform operational tooling, not in individual feature specs.

- **OR-003**: Services using the standard log plugin validate events against the shared log schema at emission time. Rejected events are handled per the operational-metrics spec for operator investigation.

- **OR-004**: The CDP web application includes automated checks that exercise primary patient chat and clinician roster flows at mobile and desktop layout sizes before release, so responsive regressions are caught before staging deploy.

## Further reading

- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
- CDP web application: [019-cdp-web-application.md](019-cdp-web-application.md)
- Structured logging ADR: [0009-structured-json-logging-with-schema-validation.md](../architecture/adrs/0009-structured-json-logging-with-schema-validation.md)
- Published API contracts ADR: [0008-published-json-schema-contracts-for-api-testing.md](../architecture/adrs/0008-published-json-schema-contracts-for-api-testing.md)
- Log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
- Platform security principles: [SECURITY.md](../SECURITY.md)
