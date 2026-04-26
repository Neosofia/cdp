# Platform Security

Platform-wide security principles that apply to every service in the CDP platform. For service-specific detail, see each service's own `SECURITY.md`.

---

## PHI Containment

Enforced architecturally, not just by policy ([Constitution §I](.specify/memory/constitution.md)):

- Raw messages with PHI exist only in the Chat Service database, encrypted at rest. No other service stores raw message content.
- All AI inference involving raw patient content runs exclusively under a HIPAA BAA ([ADR-0002](architecture/structurizr/decisions/0002-use-bedrock-for-ai-inference.md)).
- The Deidentification Pipeline is the only path through which message content reaches any downstream workload; quarantine-on-failure ensures no PHI escapes into the clean store.
- The Bedrock AI Workbench operates in a completely isolated account with no production network access.
- No PHI or PII appears in any log, metric, or error message across any service. Logs contain only opaque internal identifiers.

## Identity and Access

- We never implement our own credential storage, MFA, or password policy in any service. All human identity is delegated to a HIPAA-eligible identity provider ([ADR-0007](architecture/structurizr/decisions/0007-never-roll-your-own-authentication.md)).
- Every inbound request is authenticated at the API Gateway before being forwarded to any service.
- Access tokens are short-lived; machine-to-machine calls use narrow-scoped credentials that are explicitly rejected on user-facing endpoints.
- Device push tokens are encrypted and never leave the Devices Service; all other services hold only an opaque device identifier.

## HIPAA and Compliance

- Every service that touches PHI emits a tamper-evident audit log on every create/read event ([ADR-0004](architecture/structurizr/decisions/0004-full-row-audit-history-over-sparse-deltas.md)).
- Audit log retention is ≥ 6 years (HIPAA minimum) across all services.
- SMS opt-out (TCPA STOP/START) is enforced at the SMS Service layer with permanent suppression.

## Network and Transport

- All service-to-service communication uses TLS 1.2+. Plaintext requests are refused at the transport layer.
- Services are deployed in a private network. No data store is directly reachable from outside the platform boundary.
- An independent third-party SIEM scans platform logs for PHI/PII leakage continuously.

## Observability and Audit

Governed by [Constitution §IV](.specify/memory/constitution.md):

- Every security-relevant event across all services (authentication, access, escalation, session lifecycle) is emitted as structured JSON validated against a shared schema ([ADR-0009](architecture/structurizr/decisions/0009-structured-json-logging-with-schema-validation.md)). This enables consistent SIEM correlation rules across the platform without per-service instrumentation.

## Supply Chain

- Every service commits its dependency lockfile with cryptographic hashes. Builds use frozen installs to block uncontrolled upgrades.
- Container images are scanned for known vulnerabilities in CI; critical and high findings fail the build before any deployment.

---

## Service-Specific Security Documentation

| Service | Document |
|---|---|
| Authentication | [services/authentication/SECURITY.md](services/authentication/SECURITY.md) — OAuth 2.0 / PKCE flow, JWT signing, session management, rate limiting, and full threat model |
