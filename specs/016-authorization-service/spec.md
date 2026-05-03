# Feature Specification: Authorization Service

**Feature Branch**: `016-authorization-service`
**Created**: April 19, 2026
**Status**: Draft

## Overview

The Authorization Service is the platform's single decision point for access control. It answers the question: *"Is principal P allowed to perform action A on resource R?"*

Identity (who the caller is) is established by the Authentication Service (014-authentication-service) and encoded in the token. The Authorization Service consumes those identity claims as input to the policy engine and returns a `Allow` or `Deny` decision. No service in the platform implements its own role-string checks — all access control decisions are delegated here.

The policy engine is [Cedar](https://www.cedarpolicy.com/), backed by a managed policy store (e.g., AWS Verified Permissions). Cedar policies are stored in the managed policy store and are the authoritative source of truth for what each principal may do. The service exposes a thin HTTP wrapper that other platform services call rather than integrating with the policy store's SDK directly.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API Gateway Authorizes an Inbound Request (Priority: P1)

Every inbound API request passes through the platform API gateway. After the Authentication Service validates the token and returns identity claims, the gateway calls the Authorization Service with the principal's claims, the target service and resource, and the requested action. The Authorization Service evaluates the policy and returns `Allow` or `Deny`. The gateway only forwards the request downstream on `Allow`.

**Why this priority**: All protected platform endpoints are gated on this call. A missing or bypassed authorization check is a critical security defect.

**Independent Test**: Can be fully tested by issuing requests with known principal claims and verifying `Allow` and `Deny` decisions against known policies, including boundary cases (wrong tenant, wrong user type, deactivated role).

**Acceptance Scenarios**:

1. **Given** an authenticated patient making a request to read their own chat history, **When** the gateway calls the Authorization Service, **Then** an `Allow` decision is returned
2. **Given** an authenticated patient making a request to read another patient's chat history, **When** the gateway calls the Authorization Service, **Then** a `Deny` decision is returned with reason `principal-not-owner`
3. **Given** an authenticated clinician making a request to view an alert in their region, **When** the gateway calls the Authorization Service, **Then** an `Allow` decision is returned
4. **Given** an authenticated clinician making a request to view an alert in a different region, **When** the gateway calls the Authorization Service, **Then** a `Deny` decision is returned with reason `tenant-mismatch`
5. **Given** a machine service token for `svc-notification`, **When** it requests an action not covered by any `permit` policy for `cdp::Service::"svc-notification"`, **Then** a `Deny` decision is returned (default-deny)
6. **Given** the Authorization Service is unavailable, **When** the gateway calls it, **Then** the gateway MUST fail closed — the request is denied and not forwarded downstream

---

### User Story 2 - Service Performs a Fine-Grained Data-Level Check (Priority: P1)

Some access control decisions cannot be made at the gateway because they require knowledge of the resource's ownership or attributes (e.g., "can this clinician view this specific patient record?"). Downstream services call the Authorization Service directly for these data-level decisions, passing the principal claims and the resolved resource context.

**Why this priority**: Without data-level authZ, the platform cannot enforce patient-scope isolation — any authenticated clinician could read any patient's data.

**Independent Test**: Can be fully tested by seeding a patient owned by tenant A, calling the authorization endpoint with a clinician from tenant B, and verifying a `Deny` decision; then repeating with tenant A and verifying `Allow`.

**Acceptance Scenarios**:

1. **Given** a clinician with a valid token and a patient in their tenant, **When** the service calls the Authorization Service with the patient UUID as the resource, **Then** an `Allow` decision is returned
2. **Given** a clinician with a valid token and a patient in a different tenant, **When** the service calls the Authorization Service, **Then** a `Deny` decision is returned with reason `tenant-mismatch`
3. **Given** a request to delete a patient record by a non-admin clinician, **When** the Authorization Service is called, **Then** a `Deny` decision is returned with reason `insufficient-roles`

---

### User Story 3 - UI Batch Authorization Check for Feature Gating (Priority: P2)

The Clinician App and Patient Chat App need to know which UI features to render before showing a page (e.g., whether to show the "Take Over Chat" button, whether to show admin panels). Rather than making N sequential authorization calls, the frontend calls a batch endpoint once with a list of `{action, resource}` pairs and receives a decision for each.

**Why this priority**: Without batch evaluation, the apps must either make N round-trips (slow) or show/hide UI based on client-side role strings (insecure).

**Independent Test**: Can be fully tested by sending a batch of 5 `{action, resource}` pairs for a clinician who is allowed some and denied others and verifying the response contains the correct decision for each.

**Acceptance Scenarios**:

1. **Given** a batch of 5 authorization checks for a mixed-permission principal, **When** the batch endpoint is called, **Then** each entry in the response contains the correct `Allow` or `Deny` decision and reason
2. **Given** a batch request containing more than the allowed maximum entries (50), **When** it is received, **Then** a `400 Bad Request` is returned with a clear error message

---

### User Story 4 - Platform Team Manages Cedar Policies (Priority: P1)

The platform team needs to create, update, and audit Cedar policies in response to new features, compliance requirements, or security incidents. Policy changes are version-controlled, reviewed, and applied without service downtime.

**Why this priority**: Without a managed policy lifecycle, the authorization logic cannot evolve as the platform grows.

**Acceptance Scenarios**:

1. **Given** a new policy is published to the managed policy store, **When** the Authorization Service next evaluates a request matching that policy, **Then** the new policy is applied without requiring a service deployment
2. **Given** a policy is deleted or disabled, **When** a previously-allowed request is evaluated, **Then** a `Deny` decision is returned
3. **Given** the platform team queries the policy audit log, **Then** every policy create, update, and delete is recorded with timestamp and actor

---

### Edge Cases

- What happens if the identity claims are missing a field the policy engine expects? The Authorization Service treats the missing attribute as an empty/unknown value; the default-deny behavior applies — the request is denied.
- What happens if the managed policy store is unavailable? The service MUST fail closed — return `Deny` with reason `authz-service-unavailable` within a configurable timeout (default: 500 ms). The API gateway treats this identically to an explicit `Deny`.
- What happens when a policy conflict exists (multiple applicable policies)? The policy engine's evaluation semantics apply: any applicable `forbid` policy overrides all `permit` policies. The service does not add its own override logic.
- What happens when a new resource type is introduced before its policy exists? No `permit` policy matches → default-deny. New resource types are dark until a policy is published.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST expose a `POST /authorize` endpoint that accepts a principal (identity claims object), an action (namespaced policy action string), and a resource (namespaced entity identifier), and returns an `Allow` or `Deny` decision with a machine-readable reason code
- **FR-002**: The service MUST expose a `POST /authorize/batch` endpoint that accepts up to 50 `{action, resource}` pairs for a single principal and returns a decision for each; the principal is provided once per request, not per pair
- **FR-003**: All policy evaluation MUST be delegated to the managed policy store; the service MUST NOT implement its own policy evaluation logic
- **FR-004**: The service MUST return a `Deny` decision if the managed policy store is unavailable, does not respond within 500 ms, or returns an unexpected error (fail-closed)
- **FR-005**: The service MUST return a `Deny` decision if the presented JWT claims are missing any attribute required by the applicable Cedar policy; missing attributes MUST NOT be treated as a policy bypass
- **FR-006**: The service MUST emit a structured audit log entry for every authorization decision: principal ID, user type, action, resource, decision, reason code, and timestamp; log entries MUST NOT contain PHI or raw credential values
- **FR-007**: The service MUST expose a health endpoint (`GET /health`) that reports managed policy store reachability; downstream callers (gateway, services) use this for circuit-breaking
- **FR-008**: Policies MUST be managed exclusively in the managed policy store; no policies are hardcoded in service source code
- **FR-009**: The service MUST be callable only from within the platform's private network; the authorization endpoint is not publicly routable
- **FR-010**: The `/authorize` and `/authorize/batch` endpoints MUST require a valid platform service machine token (`user_type=service`) from the caller; human user tokens MUST NOT be accepted for direct calls to the authorization service
- **FR-011** *(M2.1 Dependency)*: The service MUST expose a `GET /api/valid-user-types` endpoint (internal only, private-network-scoped) that returns the canonical set of valid user type actors in the platform and their properties. This endpoint is consumed by the Authentication Service (014) to validate incoming WorkOS roles at token issuance time.

### Non-Functional Requirements

- **NFR-001**: `POST /authorize` p99 latency MUST be ≤ 30 ms under normal load (this endpoint is on the critical path for all API calls in concert with 014-authentication-service)
- **NFR-002**: The service MUST be horizontally scalable; no in-process state; all policy state is in the managed policy store
- **NFR-003**: Policy changes in the managed policy store MUST propagate to decision evaluation within 10 seconds of publication (eventual consistency window is acceptable within this bound)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `POST /authorize` p99 latency ≤ 30 ms under load
- **SC-002**: Service returns `Deny` within 500 ms when the managed policy store is unreachable (fail-closed verified by chaos test)
- **SC-003**: Every `Allow` and `Deny` decision appears in the structured audit log; verified by integration test
- **SC-004**: Zero authorization bypass — no test case can reach a protected resource by omitting or spoofing a JWT claim; verified by automated adversarial test suite
- **SC-005**: Policy publish → decision change round-trip ≤ 10 seconds; verified by canary test

## Assumptions

- The managed policy store is the Cedar policy store; all Cedar policies are authored and version-controlled outside of this service's codebase (in a dedicated `policies/` repository or infrastructure module) and deployed independently of service code
- The Authentication Service (014-authentication-service) is the sole issuer of tokens; the Authorization Service trusts identity claims only after the caller has been authenticated
- The Authorization Service does not validate token signatures; callers are responsible for providing pre-validated claims (the API gateway validates via 014 introspection before calling 017)
- Policy authoring, review, and deployment is the responsibility of the platform security team; this service provides the runtime evaluation endpoint only
- Resource attributes (owner, tenant) are resolved by the calling service and passed in the authorization request; this service does not perform its own data lookups against application databases
- The initial policy set covers: patient self-access, clinician regional access, clinician role-gated actions (takeover, alert dismiss), and machine service role checks; additional policies are published as new features are specced
- The service's execution permissions are scoped to policy evaluation actions only; no policy management permissions are granted to the service runtime

## Out of Scope

- Cedar policy authoring tooling and CI/CD pipeline for policies (platform infra concern)
- Human-facing policy management UI
- Audit log querying UI (the platform log query interface is sufficient for this phase)
- Relationship-based access control (ReBAC) patterns beyond what the policy engine natively supports
- Cross-tenant authorization flows
