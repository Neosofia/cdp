# Feature Specification: Authentication Service

**Feature Branch**: `014-authentication-service`
**Created**: April 18, 2026
**Status**: Final

## Overview

The Authentication Service is the platform's single source of verified identity. It has two responsibilities:

1. **Human authentication** — Users authenticate through the platform's identity provider. After identity is confirmed, the service issues a short-lived platform token the client presents on subsequent requests. Session continuity, timeout, and refresh are managed by the identity provider, not this service.
2. **Service identity** — Internal platform services authenticate to each other using short-lived tokens issued against pre-provisioned credentials. This keeps machine-to-machine traffic within the same token verification path as human traffic.

This service establishes *who* the caller is. It does not decide *what they can do* — that is the [Authorization Service's](../016-authorization-service/spec.md) responsibility.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient or Clinician Logs In (Priority: P1)

A patient or clinician opens the app and signs in. Once signed in, they stay signed in for the duration of their working session without being asked for their password again. When they're done, they can log out and know that the next person at the same device cannot reach their account without signing in again.

**Why this priority**: No one can use the platform without being able to log in and log out safely.

**Independent Test**: A user can complete the full login → use-the-app → logout cycle in a browser, and cannot reach a protected page after logout without re-authenticating.

**Acceptance Scenarios**:

1. **Given** a valid patient or clinician, **When** they sign in, **Then** they land on the app as themselves and can use it without further password prompts.
2. **Given** a user who is already signed in, **When** their working session is still active, **Then** they are not asked to sign in again as they move around the app.
3. **Given** a signed-in user, **When** they log out, **Then** they are returned to a signed-out state, and any later attempt to reach a protected page requires signing in again.
4. **Given** a signed-in user, **When** they are inactive for **15 minutes**, **Then** their session ends and they must sign in again to continue.
5. **Given** a signed-in user who remains active, **When** **12 hours** have elapsed since their original sign-in, **Then** their session ends regardless of activity and they must sign in again.
6. **Given** an attempt to sign in with tampered or invalid credentials, **When** the attempt is processed, **Then** the user is not signed in and the attempt is recorded.


### User Story 2 - Platform Services Communicate Securely with Each Other (Priority: P1)

Services inside the platform call each other to do their jobs (for example, the chat service asking the patient service for a patient record). Each caller must prove which service it is, and each receiver must be able to trust that proof without slowing the user down or adding a single point of failure to every request.

**Why this priority**: All internal platform functionality depends on services being able to identify and trust each other; without this, nothing downstream works.

**Independent Test**: A service with valid credentials can obtain a token and use it to call another service successfully; a service with invalid or deactivated credentials cannot.

**Acceptance Scenarios**:

1. **Given** a registered platform service with valid credentials, **When** it authenticates, **Then** it receives a token identifying itself as that service.
2. **Given** a service presenting a valid token to another service, **When** the receiving service checks it, **Then** the caller's identity is confirmed without needing to call the Authentication Service on every request.
3. **Given** an issued service token, **When** **5 minutes** have elapsed since issuance, **Then** the token is no longer accepted and the calling service must obtain a new one.
4. **Given** a deactivated or unknown service credential, **When** it is presented, **Then** the request is rejected.
5. **Given** a human user's token, **When** it is presented to an endpoint intended only for platform services, **Then** the request is rejected.

> **Scope note**: The Authentication Service asserts *who* the caller is. Whether the caller is *permitted* to take a specific action on a specific resource is decided by the Authorization Service (`016-authorization-service`).


### Edge Cases

- What happens when the identity provider is unreachable? New logins fail and users see a clear unavailability message. The service does not fall back to any local credential check.
- What happens if the Authentication Service itself is unavailable? New logins and service-token issuance fail. However, already-authenticated users can continue using the platform for up to **15 minutes** (their remaining session window) and already-authenticated services can continue calling each other for up to **5 minutes** (their remaining token lifetime), because downstream services verify tokens offline without calling the Authentication Service on every request.
- What happens when a user's session expires? The user is prompted to sign in again. Inactivity timeout and session renewal are owned by the identity provider.

## Requirements *(mandatory)*

### Functional Requirements

> Each FR below states a binding standard. The technical mechanism that satisfies each standard is documented in [authentication/SECURITY.md](https://github.com/Neosofia/authentication/blob/main/SECURITY.md).

- **FR-001**: Humans authenticating to the platform MUST have their identity verified by the platform's external identity provider; session continuity (refresh, inactivity timeout, reuse detection) MUST be owned by that provider, not re-implemented here. See [SECURITY.md §3.1](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#31-identity--authentication).
- **FR-002**: After successful identity verification, the service MUST issue a short-lived platform token that downstream services can trust. The token's lifetime MUST be short enough that a stolen token expires before it can cause material harm. See [SECURITY.md §3.2](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#32-token-issuance--validation).
- **FR-003**: The identity provider MUST supply the user's identity, user type, role(s), and — where the user belongs to an organization — their organization, on every successful authentication; the service MUST reject any authentication response missing these attributes. Every issued token MUST carry these attributes forward to downstream services. Role values are identity attributes consumed by the [Authorization Service](../016-authorization-service/spec.md); this service MUST NOT make access-control decisions from them. See [SECURITY.md §3.2](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#32-token-issuance--validation).
- **FR-004**: Downstream services MUST be able to verify platform tokens offline, without calling the Auth Service on every request. See [SECURITY.md §3.2](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#32-token-issuance--validation).
- **FR-005**: Internal platform services MUST be able to authenticate to each other using pre-provisioned credentials, receiving a short-lived token distinguishable from human tokens. Machine secrets MUST never be stored in a form that allows recovery of the original secret. See [SECURITY.md §3.4](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#34-machine-to-machine-credentials).
- **FR-006**: Deactivated service credentials MUST be rejected immediately. Human account deactivation is enforced by the identity provider.
- **FR-007**: A logout action MUST terminate the user's identity-provider session so that no further platform tokens can be issued for that session.
- **FR-008**: All authentication outcomes (success and failure) MUST be captured in structured JSON logs conforming to [ADR-0009](../../architecture/adrs/0009-structured-json-logging-with-schema-validation.md) and validated against [schemas/log-v1.0.0.json](https://github.com/Neosofia/schemas/blob/main/log-v1.0.0.json). Credential values, raw tokens, and PHI MUST NOT appear in any log event.
- **FR-009**: Platform tokens MUST be cryptographically signed such that downstream services can verify authenticity without holding a secret capable of forging tokens. Signing keys MUST never be embedded in application code. See [SECURITY.md §3.2](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#32-token-issuance--validation).
- **FR-010**: The service MUST only accept requests over TLS; plaintext requests MUST be refused at the transport layer.
- **FR-011**: Browser-facing authentication flows MUST be resistant to cross-site request forgery, session fixation, and cookie theft. See [SECURITY.md §3.1, §3.3, §3.5](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#31-identity--authentication) for the implemented defences.
- **FR-012**: Credential-verification paths MUST be resistant to timing side-channels: an unknown identifier MUST take the same observable time as a known one. See [SECURITY.md §3.4](https://github.com/Neosofia/authentication/blob/main/SECURITY.md#34-machine-to-machine-credentials).


## Success Criteria

- **SC-001**: A returning user with an active identity-provider session lands on the app within **2 seconds** of clicking "Log in" (p95), with no password prompt.
- **SC-002**: A first-time login (identity-provider prompt included) completes in under **10 seconds** end-to-end (p95), measured from "Log in" click to landing on the app.
- **SC-003**: During a normal workday, an active user is never forced to re-enter their password due to platform token expiry; re-issuance is invisible to the user.
- **SC-004**: Clicking "Log out" returns the user to a signed-out state within **1 second** (p95), and any subsequent attempt to reach a protected page requires a fresh login.
- **SC-005**: When the identity provider is unreachable, users see a clear, human-readable "sign-in temporarily unavailable" message within **3 seconds** — never a stack trace, blank page, or infinite spinner.
- **SC-006**: Zero user-reported incidents of PHI, email addresses, or other personal data appearing in logs, error pages, or URLs.

