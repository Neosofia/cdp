# 02. Configurable External Inference with HIPAA BAA

Date: 2026-04-19

Amended: 2026-06-17 — removed vendor-specific selection; inference provider is deployment-configurable.

## Status

Accepted

## Context

The platform requires managed AI inference for patient-facing care assistant replies and per-message clinical risk evaluation. Evaluations must be auditable, version-tracked, and compatible with constitutional PHI constraints. Any provider processing data derived from patient interactions must operate under a signed HIPAA Business Associate Agreement (BAA); self-managed or third-party inference APIs that cannot provide a BAA are not eligible for production use.

Implementation uses a synchronous orchestration path in Care Episode with an OpenAI-compatible HTTP chat-completions API. The specific vendor is an operator choice — not an architectural constant.

## Decision

1. **External managed inference only.** Services call a configured completions endpoint; they do not host model weights or operate self-managed inference infrastructure.

2. **Provider is configurable per deployment.** Operators set the completions URL, credentials, and pinned model identifiers through service configuration (for example `INFERENCE_COMPLETIONS_URL` and related secrets). Services do not hot-swap models at runtime.

3. **HIPAA BAA is mandatory before production.** No patient-derived clinical content may be sent to an inference provider until a signed BAA covering that provider and use case is in place. Development and staging may use non-production accounts only under agreed data-handling constraints.

4. **OpenAI-compatible integration shape.** Chat and Care Episode integrate through an OpenAI-compatible chat-completions HTTP API so providers can be changed without service code changes.

5. **Vendor selection is out of scope for ADRs.** Qualifying a vendor, executing the BAA, and recording the active provider for an environment belong in per-service `OPERATIONS.md`, `SECURITY.md`, and deployment configuration — not in architecture decision records.

## Consequences

- Model generation is recorded on evaluation records for audit purposes.
- Risk evaluation latency sits on the patient completion critical path; completion duration is a patient-safety signal.
- Changing inference vendor is a configuration and qualification exercise, not an ADR supersession.
- C4 diagrams may show a generic external inference dependency; a specific vendor name reflects deployment choice, not platform architecture.
