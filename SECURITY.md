# Platform Security

Platform-wide security principles that apply to every service in the CDP platform. For service-specific detail, see each service's own `SECURITY.md`.

For general SDLC and secure coding practices (including configuration, input validation, supply chain controls, and testing), see the [Neosofia SDLC Best Practices](https://neosofia.tech/resources/checklists/sdlc/).

---

## PHI Containment & Identity

*See [Constitution §I: PHI Safety](architecture/constitution.md) for core principles regarding PHI encryption, BAA usage, de-identification, and logging.*

- **Data Locality:** Raw messages with PHI exist only in the Chat Service database, encrypted at rest. No other service stores raw message content.
- **De-identification Pipeline:** The pipeline is the exclusive path through which message content reaches any downstream workload; quarantine-on-failure ensures no PHI escapes into the clean store.
- **Isolated Environments:** The Bedrock AI Workbench operates in a completely isolated account with no production network access. 
- **Identity Delegation:** We never implement our own credential storage, MFA, or password policy. All human identity is delegated to a HIPAA-eligible identity provider ([ADR-0007](architecture/structurizr/decisions/0007-never-roll-your-own-authentication.md)).
- **Short-lived Access:** Access tokens are short-lived; machine-to-machine calls use narrow-scoped credentials that are explicitly rejected on user-facing endpoints.
- **Device Anonymity:** Device push tokens are encrypted and never leave the Devices Service; all other services hold only an opaque device identifier.

## Network and Transport

- All service-to-service communication uses TLS 1.2+. Plaintext requests are refused at the transport layer.
- Services are deployed in a private network. No data store is directly reachable from outside the platform boundary.
- An independent third-party SIEM scans platform logs for PHI/PII leakage continuously.

## HIPAA, Observability & Audit

*See [Constitution §IV: Reliability & Observability](architecture/constitution.md) for overarching metrics and SLA requirements.*

- **Audit Logging:** Every service that touches PHI emits a tamper-evident audit log on every create/read event ([ADR-0004](architecture/structurizr/decisions/0004-full-row-audit-history-over-sparse-deltas.md)). Audit log retention is ≥ 6 years (HIPAA minimum) across all services.
- **Security Events:** Every security-relevant event (authentication, access, escalation, session lifecycle) is emitted as structured JSON validated against a shared schema ([ADR-0009](architecture/structurizr/decisions/0009-structured-json-logging-with-schema-validation.md)).
- **Compliance:** SMS opt-out (TCPA STOP/START) is enforced at the SMS Service layer with permanent suppression.

---

## Service-Specific Security Documentation

| Service | Document |
|---|---|
| Authentication | [Neosofia/authentication SECURITY.md](https://github.com/Neosofia/authentication/blob/main/SECURITY.md) — OAuth 2.0 / PKCE flow, JWT signing, session management, rate limiting, and full threat model |
