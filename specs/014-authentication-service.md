# Authentication Service

## Why we need this service

Every protected action on the platform begins with the same question: *who is calling?* Humans sign in through a browser or app; internal services call each other thousands of times per minute. Without a single, trusted source of identity, each service would verify credentials differently, tokens would be long-lived and hard to revoke, and a compromise in one place would spread across the mesh.

The Authentication Service exists so the platform has **one authoritative place** to confirm human identity via the external identity provider, issue short-lived platform tokens humans and services present on later requests, and provision machine credentials for service-to-service traffic. It answers *who* the caller is. It does not decide *what they are allowed to do* -- that belongs to authorization policy evaluated at each API boundary.

## How this service fits into the platform

Humans authenticate through the platform’s external identity provider. After identity is verified, this service issues a short-lived signed platform token carrying user identifier, actor class, and the identity attributes downstream services need for policy evaluation. Session continuity, inactivity timeout, and password prompts are owned by the identity provider — not re-implemented here. Logout terminates the provider session so no further platform tokens can be minted for that session.

Internal services authenticate with pre-provisioned machine credentials and receive distinguishable short-lived service tokens. Downstream services validate both human and service tokens **offline** using published signing keys -- they do not call back to this service on every request. That keeps the request path fast and avoids a single point of failure for already-authenticated traffic.

On successful human login, identity is synchronised to the User Service registry so platform roles and profile administration have a row to attach to. That synchronisation is best-effort after the session is established; login still succeeds if the registry is temporarily unreachable, with retry on later logins.

## Client objectives

**Patients and clinicians** want to sign in once, use the product for a working session, and sign out knowing the next person at the device cannot reach their account. Re-authentication after idle timeout or maximum session length should be predictable, not surprising mid-task.

**Platform engineers** building services need tokens they can verify locally without adding latency or a hard dependency on this service for every call. Service credentials should rotate safely and deactivated credentials should fail immediately.

**Security and compliance reviewers** need assurance that passwords and MFA live with the identity provider, tokens are short-lived and cryptographically verifiable, authentication outcomes are auditable without credential leakage, and browser flows resist common web attacks.

**Operators** need to measure login success and failure, token issuance, and service authentication without PHI, email addresses, or raw tokens appearing in logs or error surfaces.

## Workflows

**Human sign-in (happy path).** Given a person completes sign-in through the identity provider, when identity attributes are complete and valid, then this service issues a short-lived platform token, synchronises identity to the User registry when possible, and downstream services can verify the token locally without calling back on every request.

**Sign-out.** Given a signed-in person chooses to sign out, when logout completes, then the identity-provider session ends and no new platform tokens can be issued for that session.

## Functional requirements

- **FR-001**: Human identity is verified exclusively through the platform’s external identity provider. Session continuity (refresh, inactivity timeout, reuse detection) is owned by that provider. The service does not implement a parallel username/password store. Mechanism and threat-model detail live in the service security document.

- **FR-002**: After successful identity verification, the service issues a short-lived platform token downstream services can verify offline. Token lifetime is short enough that a stolen token expires before it can cause material harm.

- **FR-003**: The identity provider supplies user identifier, user type, roles, and -- where applicable -- organisation on every successful authentication. Authentication responses missing required attributes are rejected. Issued tokens carry these attributes forward. Role values are identity inputs for authorization elsewhere; this service does not make access-control decisions from them.

- **FR-004**: Downstream services verify platform tokens locally using published signing keys without calling this service on each request.

- **FR-005**: Internal platform services authenticate with pre-provisioned credentials and receive short-lived tokens distinguishable from human tokens. Machine secrets are stored so the original secret cannot be recovered from the database.

- **FR-006**: Deactivated service credentials are rejected immediately. Human account deactivation is enforced by the identity provider.

- **FR-007**: Logout terminates the user’s identity-provider session so no further platform tokens can be issued for that session.

- **FR-008**: Authentication outcomes (success and failure) are captured in structured logs validated against the platform log schema. Credential values, raw tokens, and PHI do not appear in any log event.

- **FR-009**: Platform tokens are cryptographically signed so downstream services can verify authenticity without holding a secret capable of forging tokens. Signing keys are not embedded in application code.

- **FR-010**: Browser-facing authentication flows resist cross-site request forgery, session fixation, and cookie theft. Implemented defences are documented in the service security document.

- **FR-011**: Credential-verification paths are resistant to timing side-channels: an unknown identifier takes the same observable time as a known one.

- **FR-012**: When the identity provider is unreachable, new logins fail with a clear unavailability message. There is no fallback to local credential checking.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** authentication behaviour. At minimum:

  - Classifying human and service authentication outcomes by result
  - Counting token issuance by token type
  - Detecting identity-provider unavailability windows

- **OR-002**: When this service is unavailable, already-issued tokens remain valid until their natural expiry so authenticated users and services can continue within their remaining session or token window. New logins and new service-token issuance fail until recovery.

- **OR-003**: Identity synchronisation to the User Service is retried after transient failures. Operators can observe synchronisation backlog without inspecting personal data in logs.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Service security and token mechanics: [SECURITY.md](https://github.com/Neosofia/authentication/blob/main/SECURITY.md)
- Authorization service spec: [016-authorization-service.md](https://github.com/Neosofia/cdp/blob/main/specs/016-authorization-service.md)
- User service spec: [018-user-service.md](https://github.com/Neosofia/cdp/blob/main/specs/018-user-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- Structured logging ADR: [0009-structured-json-logging-with-schema-validation.md](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0009-structured-json-logging-with-schema-validation.md)
- Log schema: [log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json)
- API contract: [openapi.json](https://github.com/Neosofia/authentication/blob/main/openapi.json)
- Never roll your own authentication: [0007-never-roll-your-own-authentication.md](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0007-never-roll-your-own-authentication.md)
