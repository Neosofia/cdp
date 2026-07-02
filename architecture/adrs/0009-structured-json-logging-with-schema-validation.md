# 09. Structured JSON Logging with Schema Validation

Date: 2026-04-21

## Status

Accepted — implemented in Authentication Service (014)

## Context

Constitution §IV mandates operational observability. To enable this, logs must be:

1. **Machine-readable** — so monitoring systems, log aggregators (ELK, Datadog), and observability platforms can parse them programmatically
2. **Validated** — so log consumers don't encounter malformed entries, unexpected fields, or type mismatches
3. **Consistent** — so all services emit logs in the same structure, enabling centralized querying and alerting

Prior practice of unstructured string logs (`logger.info("User login: " + username)`) prevents observability:
- No schema enforcement → log format varies by developer
- No machine parsing → monitoring tools resort to regex (brittle, slow)
- No consistency → event details scattered across ad-hoc fields, making cross-service queries impossible

## Decision

All services in CDP MUST emit logs as **JSON** with the following constraints:

1. **JSON format** — every log entry is valid JSON with `timestamp`, `level`, `message`, and optional structured fields
2. **Schema validation** — logs MUST conform to the schema defined in `schemas/log.json`
3. **Structured fields** — logs SHOULD include contextual fields for debugging and observability:
   - `event_type` — structured event identifier (e.g., `platform_token_issued`, `health_check_failed`)
   - `user_id`, `user_type` — user context for debugging and incident response (NOT for audit trails)
   - `error`, `reason`, `detail` — additional context for troubleshooting
4. **Test validation** — integration tests MUST validate at least one request's logs against `schemas/log.json` using `jsonschema.validate()` (integration layer per [ADR-0020](0020-layered-testing-strategy-for-services-and-browser-ui.md))

### Important: Logs Are NOT Audit Trails

Logs are **not durable or atomic** and must NOT be relied upon for audit trails, compliance, or forensics. Delivery is not guaranteed and entries may be lost, reordered, or duplicated. For audit requirements, use a dedicated audit event store (e.g., append-only event log in PostgreSQL).

## Logging Pattern

The shared Python SDK plugin `logenvelope` enforces structured JSON formatting and schema consistency across Python platform services. Testing layer placement: [ADR-0020](0020-layered-testing-strategy-for-services-and-browser-ui.md). Schema patterns: [schemas/README.md](https://github.com/Neosofia/schemas/blob/main/README.md).

## References

- Constitution §IV — Trustworthy Operation
- [ADR-0020](0020-layered-testing-strategy-for-services-and-browser-ui.md) — integration test layers
- Shared Schemas — [schemas/README.md](https://github.com/Neosofia/schemas/blob/main/README.md)
- Log Schema — [schemas/log.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
- Auth Service implementation — [src/logging_config.py](https://github.com/Neosofia/authentication/blob/main/src/logging_config.py), [tests/contract/test_api_contract.py](https://github.com/Neosofia/authentication/blob/main/tests/contract/test_api_contract.py)
