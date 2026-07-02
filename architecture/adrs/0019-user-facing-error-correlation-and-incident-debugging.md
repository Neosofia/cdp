# 19. User-Facing Error Correlation and Incident Debugging

Date: 2026-07-01

## Status

Accepted — CDP UI implements helpdesk trace codes (`ui/src/shared/core/userFacingError.ts`)

## Context

Constitution §IV requires operators to detect problems and respond before patient care is affected. That depends on **low-friction debugging**: when a user or clinician hits a failure, helpdesk and engineering must be able to find the corresponding traces and logs quickly — ideally before the phone call.

Prior practice in the CDP UI included silent `catch` blocks that returned empty lists or `null`, which made failures look like “no data” and left support with no correlation handle. Separately, generic error text without a trace anchor forced helpdesk to ask many questions before searching Grafana.

Platform logging already mandates structured JSON and correlation identifiers ([ADR-0009](0009-structured-json-logging-with-schema-validation.md)). The gap was the **user → helpdesk → logs** bridge.

## Decision

1. **No silent swallowing on user-facing paths** — API and UI layers MUST NOT catch errors and return empty success shapes unless the degradation is explicitly documented (e.g. optional display enrichment with a named fallback). Unknown failures MUST surface to the user or to operator-visible error state.

2. **Helpdesk correlation code** — When the UI shows a generic or contextual unknown error, it MUST include a short **helpdesk code**: the last eight hexadecimal characters of the active OpenTelemetry trace ID (uppercase). Example user copy:  
   `We encountered an unknown error. If you contact our helpdesk, please reference code: A1B2C3D4.`

3. **Trace propagation** — The CDP UI MUST propagate W3C `traceparent` on outbound fetch calls (OpenTelemetry web instrumentation) so backend logs and the user-visible code refer to the same trace.

4. **Known API errors** — Sanitized server messages from `apiErrorMessage` (and equivalent contract-aware helpers) MAY be shown without a helpdesk code when the message is already actionable and does not expose internal detail.

5. **Operator lookup** — Helpdesk and operators search centralized logs/traces (Grafana / Locomotive) for the full 32-character trace ID whose suffix matches the helpdesk code. See [OPERATIONS.md](../../OPERATIONS.md) (staging observability). **Target state ([cdp#11](https://github.com/Neosofia/cdp/issues/11)):** a one-click Grafana incident dashboard deep link (trace ID variable) in tickets and runbooks — no manual LogQL assembly.

6. **Future: proactive ticketing + Grafana deep links** — A follow-up SHOULD (a) deploy a Grafana **incident trace** dashboard filtered by trace ID, and (b) expose an API that creates a helpdesk ticket (e.g. Zendesk) containing the helpdesk code and clickable Grafana URL, so staff can investigate before the user calls. Tracked in [cdp#11](https://github.com/Neosofia/cdp/issues/11).

## Consequences

**Positive**

- Support can jump from user report to trace/log search in one step.
- Silent data-loss UX is replaced by explicit failure states.
- Aligns UI behavior with Constitution §IV and SDLC operational-awareness checklist items.

**Negative / trade-offs**

- Users see more error banners; copy must stay concise and free of PHI.
- Helpdesk codes from client-only spans (no backend request) may not appear in server logs — prefer errors during traced fetch calls.
- Proactive ticketing requires privacy review (what metadata may leave the platform boundary).
- Grafana deep links must not embed secrets; helpdesk uses existing Grafana SSO ([cdp#11](https://github.com/Neosofia/cdp/issues/11)).

## References

- Constitution §IV — Trustworthy Operation
- [ADR-0009](0009-structured-json-logging-with-schema-validation.md) — structured logs and correlation fields
- [Neosofia SDLC checklist — Logging, Observability & Operational Awareness](https://github.com/Neosofia/corporate/blob/main/resources/checklists/sdlc.md#logging-observability--operational-awareness)
- [ADR-0020](0020-layered-testing-strategy-for-services-and-browser-ui.md) — layered testing strategy (UI E2E vs service unit/integration)
- CDP UI — `ui/src/shared/core/userFacingError.ts`
