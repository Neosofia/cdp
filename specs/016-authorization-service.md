# Authorization Service

## Why we need this service

Knowing *who* is calling — from the Authentication Service — is not enough. A patient may read their own chat history but not another patient’s. A clinician may act on patients in their clinic but not across the hospital. An internal notifier may send alert email but not rotate machine credentials. If each service encodes those rules ad hoc with string comparisons and copy-pasted role checks, policies drift, audits disagree, and a single missed branch becomes a data breach.

The Authorization Service exists so the platform has **one authoritative distribution point** for access policy definitions and version metadata. Consuming services fetch applicable policies, evaluate them locally against identity claims and service-owned resource data, and fail closed when policy material is unavailable. It distributes policy; it does not sit in the request path as a remote allow-or-deny oracle for every call.

## How this service fits into the platform

Identity arrives on every request as validated platform token claims. Before business logic runs, each service’s shared authorization middleware loads the policy bundle distributed for that service, builds principal and resource context from local data, and evaluates whether the action is permitted in-process. The handler runs only on allow; missing attributes or unavailable policy material produce deny.

No end-user client calls this service directly. Human-facing UI entitlements (menu visibility, feature toggles) are a separate concern handled by the Capabilities Service and product-owned policy bundles — not duplicated here. API-boundary authorization stays at each service, using policies this service distributes and middleware from the platform SDK.

Policies are authored in version control, reviewed like code, and deployed to the distribution surface this service serves. Resource attributes (owner, clinic, tenant) are resolved by the calling service and passed into evaluation; this service does not query application databases at runtime.

## Client objectives

**Service teams** want a standard way to protect routes without inventing authorization plumbing per repo. They need fetchable policy bundles, cache guidance, and middleware that handles retrieval, evaluation, expiry, and fail-closed behaviour.

**Patients** expect the platform to enforce self-access — their data is visible to them and not to other patients — consistently across chat, profile, and care experiences.

**Clinicians** expect clinic-scoped access: they can act on assigned patients within their organisation context and are denied when the resource belongs elsewhere or their role is insufficient for destructive actions.

**Platform security reviewers** want policies versioned, reviewable, and default-deny. Machine service identities should receive only the permits defined for their service principal — nothing implied by possession of a token alone.

**Operators** need to measure policy distribution health and confirm consumers fail closed when bundles cannot be loaded, without PHI or credential material in logs.

## Workflows

**Policy refresh on deploy.** Given a service releases with an updated policy bundle pin, when the service starts or its cache expires, then it fetches the current bundle from this service and denies requests if the bundle cannot be loaded — never proceeding unaudited.

**Missing resource attributes.** Given an authorised caller requests an action but the service cannot supply required resource attributes for evaluation, when middleware runs, then the decision is deny and the handler does not run.

## Functional requirements

- **FR-001**: The service exposes a policy distribution mechanism so authorised platform services fetch the latest policy definitions for their deployment.

- **FR-002**: Policy metadata includes version identifiers and cache lifetime guidance so consuming middleware selects and refreshes the correct bundle without ad hoc assumptions.

- **FR-003**: Runtime allow and deny decisions for individual requests are evaluated by consuming middleware using service-owned data. This service does not perform per-request authorization over the network.

- **FR-004**: Consumers respect service-provided cache expiry when refreshing bundles so stale policy does not linger silently and refresh storms do not overwhelm the distribution surface.

- **FR-005**: Authorization middleware returns deny when required principal or resource attributes are missing. Missing attributes are never treated as a policy bypass.

- **FR-006**: Default-deny holds: when no permit covers a principal, action, and resource combination, the decision is deny.

- **FR-007**: Structured logs cover policy bundle distribution and metadata access. Logs do not contain PHI or raw credential values.

- **FR-008**: Liveness reporting confirms policy distribution availability so consumers can detect outage and fail closed.

- **FR-009**: Policies are managed in version control and served from the distribution store — not hard-coded in consuming service application logic.

- **FR-010**: Policy distribution is reachable only from the platform private network; it is not publicly routable.

- **FR-011**: Policy distribution requires a valid platform service machine identity. Human session tokens are not accepted for bundle fetch.

- **FR-012**: An internal roles reference (private-network scope) exposes the canonical set of valid platform roles for consumers such as the Authentication Service at token issuance time. Role catalog authority for assignment lives in the User Service; this reference supports validation against the shared vocabulary.

- **FR-013**: The platform provides official authorization middleware for supported languages, encapsulating policy retrieval, local evaluation, cache expiry handling, and fail-closed behaviour so teams do not re-implement those concerns per service.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** bundle fetch outcomes, latency, and consumer fail-closed rates.

- **OR-002**: The service is horizontally scalable with no in-process authorization state; policy material is served from versioned bundle storage.

- **OR-003**: Policy changes merged in version control are deployable to the distribution service without manual runtime editing in consuming components.

- **OR-004**: When this service is unavailable or a bundle cannot be fetched, consuming middleware denies requests rather than proceeding unaudited — operators can detect elevated deny rates correlated with distribution outage.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Policy engine and bundle format: [policies/README.md](../policies/README.md)
- Authorization middleware (SDK): [authorization-middleware](https://github.com/Neosofia/sdk/tree/main/python/authorization-middleware)
- Service policy template: [templates/python/service/policies](https://github.com/Neosofia/templates/tree/main/python/service/policies)
- Authentication service spec: [014-authentication-service.md](014-authentication-service.md)
- User service spec (role catalog): [018-user-service.md](018-user-service.md)
- UI capabilities (separate control plane): [020-capabilities-service.md](020-capabilities-service.md), [0012-ui-capabilities-control-plane.md](../architecture/adrs/0012-ui-capabilities-control-plane.md)
- Capabilities service: [capabilities](https://github.com/Neosofia/capabilities)
- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
