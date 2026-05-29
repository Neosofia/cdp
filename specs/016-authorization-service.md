# Authorization Service

## Why we need this service

Knowing *who* is calling -- from the Authentication Service -- is not enough. A patient may read their own chat history but not another patient’s. A clinician may act on patients in their clinic but not across the hospital. An internal notifier may dispatch push messages but not rotate machine credentials. If each service encodes those rules ad hoc with string comparisons and copy-pasted role checks, policies drift, audits disagree, and a single missed branch becomes a data breach.

The Authorization Service exists so the platform has **one authoritative distribution point** for Cedar policy definitions and version metadata. Consuming services fetch applicable policies, evaluate them locally against identity claims and service-owned resource data, and fail closed when policy material is unavailable. It distributes policy; it does not sit in the request path as a remote “allow/deny” oracle for every call.

## How this service fits into the platform

Identity arrives on every request as validated platform token claims. Before business logic runs, each service’s shared authorization middleware loads the Cedar policy bundle (from disk or from this service’s distribution endpoint), builds principal and resource entities from local data, and evaluates `principal + action + resource` in-process. The handler runs only on `Allow`; missing attributes or unavailable policy bundles produce `Deny`.

No end-user client calls this service directly. Human-facing UI entitlements (menu visibility, feature toggles) are a separate concern handled by the Capabilities Service and product-owned policy bundles -- not duplicated here. API-boundary authorization stays at each service, using policies this service distributes and middleware from the platform SDK.

Policies are authored in version control, reviewed like code, and deployed to the distribution surface this service serves. Resource attributes (owner, clinic, tenant) are resolved by the calling service and passed into evaluation; this service does not query application databases at runtime.

## Client objectives

**Service teams** want a standard way to protect routes without inventing authorization plumbing per repo. They need fetchable policy bundles, cache guidance, and SDK middleware that handles retrieval, evaluation, expiry, and fail-closed behaviour.

**Patients** expect the platform to enforce self-access -- their data is visible to them and not to other patients -- consistently across chat, profile, and care experiences.

**Clinicians** expect clinic-scoped access: they can act on assigned patients within their organisation context and are denied when the resource belongs elsewhere or their role is insufficient for destructive actions.

**Platform security reviewers** want policies versioned, reviewable, and default-deny. Machine service identities should receive only the permits defined for their service principal -- nothing implied by possession of a token alone.

**Operators** need to measure policy distribution health and confirm consumers fail closed when bundles cannot be loaded, without PHI or credential material in logs.

## Functional requirements

- **FR-001**: The service exposes a policy distribution mechanism -- filesystem-backed bundle endpoint or equivalent -- so authorized platform services fetch the latest Cedar policy definitions for their deployment.

- **FR-002**: Policy metadata includes version identifiers and cache lifetime guidance so consuming middleware selects and refreshes the correct bundle without ad hoc TTL assumptions.

- **FR-003**: Runtime `Allow`/`Deny` decisions for individual HTTP requests are evaluated by consuming middleware and SDKs using service-owned data. This service does not perform per-request authorization over the network.

- **FR-004**: Consumers respect service-provided cache expiry when refreshing bundles so stale policy does not linger silently and thundering herds do not hammer the distribution endpoint.

- **FR-005**: Authorization middleware returns `Deny` when required principal or resource attributes are missing. Missing attributes are never treated as a policy bypass.

- **FR-006**: Default-deny holds: when no `permit` policy covers a principal, action, and resource combination, the decision is `Deny`.

- **FR-007**: Structured logs cover policy bundle distribution and metadata access. Logs do not contain PHI or raw credential values.

- **FR-008**: A health endpoint reports policy distribution availability so consumers can circuit-break and refresh logic can detect outage.

- **FR-009**: Policies are managed in version control and served from the distribution store -- not hardcoded in consuming service application code.

- **FR-010**: Policy distribution endpoints are reachable only from the platform private network; they are not publicly routable.

- **FR-011**: Distribution endpoints require a valid platform service machine token. Human user tokens are not accepted for bundle fetch.

- **FR-012**: An internal roles API (private-network scope) exposes the canonical set of valid platform roles for consumers such as the Authentication Service at token issuance time. Role catalog authority for assignment lives in the User Service; this endpoint supports validation against the shared vocabulary.

- **FR-013**: The platform provides an official authorization SDK and middleware for supported languages, encapsulating policy retrieval, local Cedar evaluation, cache expiry handling, and fail-closed behaviour so teams do not re-implement those concerns per service.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** bundle fetch outcomes, latency, and consumer fail-closed rates.

- **OR-002**: The service is horizontally scalable with no in-process authorization state; policy material is served from filesystem or static bundle storage.

- **OR-003**: Policy changes merged in version control are deployable to the distribution service without manual runtime editing in consuming components.

- **OR-004**: When the Authorization Service is unavailable or a bundle cannot be fetched, consuming middleware denies requests rather than proceeding unaudited -- operators can detect elevated deny rates correlated with distribution outage.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Authorization middleware (SDK): [authorization-middleware](https://github.com/Neosofia/sdk/tree/main/python/authorization-middleware)
- Service policy template: [templates/python/service/policies](https://github.com/Neosofia/templates/tree/main/python/service/policies)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- User service spec (role catalog): [018-user-service.md](https://github.com/Neosofia/cdp/blob/main/specs/018-user-service.md)
- UI capabilities (separate control plane): [0012-ui-capabilities-control-plane.md](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0012-ui-capabilities-control-plane.md)
- Capabilities service: [capabilities](https://github.com/Neosofia/capabilities)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
