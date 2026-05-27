## Feature Specification: Authorization Service

### Overview

The Authorization Service is the platform's policy distribution service for access control. It provides Cedar policy definitions and version metadata to internal platform services and their shared authorization middleware. No end-user client or public-facing client calls it directly.

Identity (who the caller is) is established by the Authentication Service (014-authentication-service) and encoded in the token. The Authorization Service does not evaluate access requests itself. Instead, consuming services fetch the applicable policies, evaluate them locally using their own data, and return `Allow` or `Deny` decisions accordingly. No service in the platform implements its own role-string checks beyond authorized middleware and SDK behavior.

The service is the authoritative source of policy definitions and distribution metadata; it is not the runtime decision endpoint.


### Consumer Scenarios & Testing

#### Service Validates an Inbound Platform Request

Each platform service must validate incoming requests using shared authorization middleware. After the Authentication Service validates the token, the service's middleware loads the applicable Cedar policies from the Authorization Service, evaluates them against local identity claims, the target resource, and the requested action, and then returns `Allow` or `Deny`. The service only processes the request if the middleware returns `Allow`.


##### Self Referential Scope

The service should support the ability to answer access requests when the prinicpal owns the resource in question.

1. **Given** an authenticated patient making a request to read their own chat history, **When** the service's authorization middleware evaluates the applicable policies, **Then** an `Allow` decision is returned and the request is processed
2. **Given** an authenticated patient making a request to read another patient's chat history, **When** the service's authorization middleware evaluates the applicable policies, **Then** a `Deny` decision is returned with reason `principal-not-owner` and the request is rejected


##### Group Scope

The service should support the ability to answer access requests when the prinicapl is a member of a group of resources.

4. **Given** an authenticated clinician with a valid token and a patient assigned to the same clinic, **When** the service's authorization middleware evaluates the applicable policies with the patient UUID as the resource, **Then** an `Allow` decision is returned
4. **Given** a clinician with a valid token and a patient assigned to a different clinic, **When** the service's authorization middleware evaluates the applicable policies, **Then** a `Deny` decision is returned with reason `clinic-mismatch`
5. **Given** a request to delete a patient record by a non-admin clinician, **When** the service's authorization middleware evaluates the applicable policies, **Then** a `Deny` decision is returned with reason `insufficient-roles`

####




##### Edge Cases and fallback logic

6. **Given** a machine service token for `svc-notification`, **When** the service requests an action not covered by any `permit` policy for `cdp::Service::"svc-notification"`, **Then** a `Deny` decision is returned (default-deny)
7. **Given** the Authorization Service is unavailable or the policy bundle cannot be fetched, **When** the middleware attempts evaluation, **Then** the service MUST fail closed — the request is denied and not processed


### Requirements

#### Functional Requirements

- **FR-001**: The service MUST expose a filesystem-backed policy distribution mechanism or equivalent policy bundle endpoint that lets authorized platform services fetch the latest Cedar policy definitions.
- **FR-002**: The service MUST expose policy metadata, including version identifiers and cache guidance, so consuming middleware can select and refresh the correct set of policies.
- **FR-003**: Policy evaluation MUST be performed by consuming middleware / SDKs using service-owned data. The Authorization Service must not perform runtime `Allow`/`Deny` decisions for individual requests.
- **FR-004**: The service MUST make cache lifetime guidance available to consumers and consumers MUST respect the service-provided expiry rather than making their own caching assumptions.
- **FR-005**: The authorization middleware MUST return `Deny` if required principal or resource attributes are missing; missing attributes MUST NOT be treated as a policy bypass.
- **FR-006**: The service MUST emit structured logs for policy bundle distribution and metadata access; logs MUST NOT contain PHI or raw credential values.
- **FR-007**: The service MUST expose a health endpoint (`GET /health`) that reports policy distribution availability; downstream consumers may use this for circuit-breaking and policy refresh logic.
- **FR-008**: Policies MUST be managed in version control and served by the Authorization Service from the filesystem or policy bundle store; no policies are hardcoded in consuming service application code.
- **FR-009**: The service MUST be callable only from within the platform's private network; the policy distribution endpoint is not publicly routable.
- **FR-010**: The policy distribution endpoints MUST require a valid platform service machine token (`user_type=service`) from the caller; human user tokens MUST NOT be accepted.
- **FR-011** *(M2.1 Dependency)*: The service MUST expose a roles API (internal only, private-network-scoped) that returns the canonical set of valid platform roles. This endpoint is consumed by the Authentication Service (014) to validate roles at token issuance time.
- **FR-012**: The service MUST make cache lifetime guidance available to consumers and consumers MUST respect the service-provided expiry rather than making their own caching assumptions.

#### Operational Requirements

- **OR-001**: Policy bundle retrieval p99 latency MUST be ≤ 100 ms under normal load, so consuming middleware can refresh policy definitions without excessive delay.
- **OR-002**: The service MUST be horizontally scalable; no in-process state; all policy state is served from the filesystem or static bundle storage.
- **OR-003**: Policy changes in version control MUST be deployable to the policy distribution service without requiring manual policy editing in runtime components.
- **OR-004**: The platform MUST provide an official Authorization SDK and middleware for supported languages. SDKs MUST encapsulate policy retrieval, local policy evaluation, cache expiry handling, and fail-closed behavior so that each team does not need to re-invent these concerns. Teams implementing services must use the SDK.

### Assumptions

- Cedar policies are authored and version-controlled outside of this service's runtime code, stored in a dedicated `policies/` repository or file system, and served as policy bundles by the Authorization Service.
- The Authentication Service (014-authentication-service) is the sole issuer of tokens; the Authorization Service trusts identity claims only after the caller has been authenticated.
- The Authorization Service does not validate token signatures; callers are responsible for providing pre-validated claims (the API gateway validates via 014 introspection before calling 017).
- Policy authoring, review, and deployment is the responsibility of the platform security team; this service provides policy distribution only, not runtime decisions.
- Resource attributes (owner, clinic, tenant) are resolved by the calling service and passed into the authorization middleware; the Authorization Service does not perform its own data lookups against application databases.
- The initial policy set covers: patient self-access, clinician clinic-based access, clinician role-gated actions (takeover, alert dismiss), and machine service role checks; additional policies are published as new features are specced.
- The service's execution permissions are scoped to policy distribution actions only; no policy evaluation permissions are granted to the service runtime.


### Out of Scope

- Human-facing policy management UI
- Audit log querying UI (the platform log query interface is sufficient for this phase)
- Relationship-based access control (ReBAC) patterns beyond what the policy engine natively supports
- Cross-tenant authorization flows
