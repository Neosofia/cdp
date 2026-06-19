# Platform Authorization

## Why we need this capability

Knowing *who* is calling — from the Authentication Service — is not enough. A patient may read their own chat history but not another patient’s. A clinician may act on patients in their clinic but not across the hospital. An internal notifier may send alert email but not rotate machine credentials. If each service encodes those rules ad hoc with string comparisons and copy-pasted role checks, policies drift, audits disagree, and a single missed branch becomes a data breach.

The platform uses **two complementary authorization planes**, each with a clear job:

1. **UI authorization** — which menus, screens, and operator tools a signed-in person may see in the browser, evaluated by the Capabilities Service from product UI policy ([020-capabilities-service.md](020-capabilities-service.md), [ADR-0012](../architecture/adrs/0012-ui-capabilities-control-plane.md)). Future releases extend this plane with entitlements and feature toggles without changing backend API rules.

2. **API authorization** — whether a caller may perform a specific action on a specific resource at a service boundary, evaluated **locally in each service** from that service’s Cedar policy bundle. Policies are **federated**: each domain service owns and maintains the rules for its resources; there is no central remote allow-or-deny oracle on the request path.

Hiding a menu does not authorize an API call, and a permitted API does not imply a visible menu. Both planes must agree for a safe end-to-end experience.

## How this capability fits into the platform

After Authentication establishes identity, every protected request passes through authorization before business logic runs.

**UI plane.** The CDP web application requests entitlement booleans from the Capabilities Service after login and role selection. Product authors express visibility in versioned Cedar policy shipped with the deploying product. Capabilities evaluates coarse `View` permits for UI entities; it does not decide patient ownership, clinic scope, or destructive API actions.

**API plane.** Each HTTP service loads its Cedar policy bundle at deployment and evaluates permits in-process using shared platform middleware. The service resolves resource attributes (owner, clinic, tenant, episode state) from its own data and passes principal and resource context into evaluation. Allow proceeds to the handler; deny, missing attributes, or unavailable policy material stop the request without running business logic.

Policies are authored in version control, reviewed like code, and released with the owning service or product policy bundle. Distribution mechanics and consumer wiring are documented in [policies/README.md](../policies/README.md) and service `OPERATIONS.md` files — not prescribed here.

Role vocabulary for assignment and token embedding lives in the User Service and product role catalog ([018-user-service.md](018-user-service.md), [ADR-0014](../architecture/adrs/0014-tenant-types-and-org-roles.md)). Cedar policy files are the source of truth for what each role may do at each boundary.

## Client objectives

**Product authors** want UI visibility and API permits expressed as reviewable policy in one vocabulary, without duplicating permission matrices in application code.

**Service teams** want a standard middleware contract for route protection — principal context, resource attributes, default deny, and fail-closed behaviour — without inventing authorization plumbing per repository.

**Patients** expect self-access enforced consistently: their data is visible to them and not to other patients across chat, profile, and care experiences.

**Clinicians** expect clinic-scoped access: they can act on assigned patients within their organisation context and are denied when the resource belongs elsewhere or their role is insufficient for destructive actions.

**Platform security reviewers** want policies versioned, reviewable, and default-deny. Machine service identities receive only the permits defined for their service principal — nothing implied by possession of a token alone.

**Operators** need to confirm services fail closed when policy bundles cannot be loaded and that elevated deny rates can be correlated with a bad deploy — without PHI or credential material in logs.

## Workflows

**API request with sufficient context.** Given a caller presents a valid platform token and the service can supply the resource attributes Cedar needs, when middleware evaluates the action against the service policy bundle, then an allow proceeds to the handler and a deny returns without running business logic.

**Missing resource attributes.** Given an authenticated caller requests an action but the service cannot supply required resource attributes for evaluation, when middleware runs, then the decision is deny and the handler does not run.

**Unavailable policy bundle.** Given a service starts or runs without a valid policy bundle for its deployment, when a protected request arrives, then middleware denies the request and operators can detect load failure through health and structured logs.

**UI navigation after login.** Given a person has signed in and chosen a role context, when the application requests UI entitlements, then Capabilities returns permitted and denied UI areas from product policy and the application renders navigation from that answer — independent of any single backend API call on that path.

## Functional requirements

### Two planes

- **FR-001**: UI authorization and API authorization are separate concerns with separate evaluation paths. Neither plane substitutes for the other.

- **FR-002**: UI authorization is specified in [020-capabilities-service.md](020-capabilities-service.md). This document specifies API authorization and the shared rules both planes obey.

### API authorization (federated Cedar)

- **FR-003**: Each platform HTTP service enforces access at its API boundary using Cedar policy owned and maintained in that service’s repository or product policy bundle. No service delegates per-request allow-or-deny decisions to another service over the network.

- **FR-004**: Authorization middleware evaluates permits in-process before business logic runs, using principal facts from the validated platform token and resource attributes resolved by the owning service from its own data.

- **FR-005**: Default-deny holds: when no permit covers a principal, action, and resource combination, the decision is deny.

- **FR-006**: Authorization middleware returns deny when required principal or resource attributes are missing. Missing attributes are never treated as a policy bypass.

- **FR-007**: When policy material required for evaluation is missing or invalid at runtime, middleware denies protected requests and does not proceed unaudited.

- **FR-008**: Policies are managed in version control and supplied with the service deployment — not hard-coded as ad hoc conditionals in handlers.

- **FR-009**: Machine service principals and human session principals are distinguishable in evaluation context. Permits for internal callers are explicit in service policy; possession of a token alone does not imply broad access.

- **FR-010**: Structured logs cover authorization outcomes at the service boundary where the platform logging contract applies. Logs do not contain PHI, clinical narrative, or raw credential values.

### Shared expectations

- **FR-011**: The platform provides official authorization middleware for supported languages so teams do not re-implement evaluation, attribute handling, and fail-closed behaviour per service.

- **FR-012**: Product-specific API vocabulary and UI vocabulary may share a role catalog for assignment and pickers, but permission rules live in Cedar policy files — not in a parallel JSON permission matrix ([ADR-0014](../architecture/adrs/0014-tenant-types-and-org-roles.md)).

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Each service’s logs support **measuring** authorization deny rate and policy load failures without logging personal identifiers or full policy evaluation context at routine production levels.

- **OR-002**: Policy changes merged in version control are deployable with the owning service or product bundle release without manual runtime editing in application handlers.

- **OR-003**: When a service cannot load its policy bundle, operators can detect failure through health checks and structured logs and correlate elevated deny rates with the offending release.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- UI authorization (Capabilities): [020-capabilities-service.md](020-capabilities-service.md)
- UI capabilities ADR: [0012-ui-capabilities-control-plane.md](../architecture/adrs/0012-ui-capabilities-control-plane.md)
- Tenant types and roles: [0014-tenant-types-and-org-roles.md](../architecture/adrs/0014-tenant-types-and-org-roles.md)
- User service (role catalog): [018-user-service.md](018-user-service.md)
- Authentication service: [014-authentication-service.md](014-authentication-service.md)
- Policy bundles and consumer wiring: [policies/README.md](../policies/README.md)
- Authorization middleware (SDK): [authorization-middleware](https://github.com/Neosofia/sdk/tree/main/python/authorization-middleware)
- Service policy template: [templates/python/service/policies](https://github.com/Neosofia/templates/tree/main/python/service/policies)
