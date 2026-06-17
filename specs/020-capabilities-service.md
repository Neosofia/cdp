# Capabilities Service

## Why we need this service

Every product built on the platform needs a consistent answer to a simple question: *which menus, screens, and operator tools may this signed-in person see?* Backend services already enforce fine-grained access at the API boundary; the browser application needs a **central, policy-driven** way to decide coarse UI visibility without scattering product rules through client code.

The Capabilities Service exists so UI entitlements are evaluated from versioned product policy, testable on their own, and separate from each domain service’s API rules.

## How this service fits into the platform

Deploying products such as CDP ship UI entitlement policy as part of their policy bundle. At runtime this service loads that bundle and, for a signed-in person and active role context, returns which UI areas are permitted. The CDP web application prefetches those answers after login so menus do not flicker as people navigate.

Backend chat, recovery, and registry APIs do **not** call this service on their critical path. They continue to enforce access at the API boundary through distributed service policy ([016-authorization-service.md](016-authorization-service.md)). Human login is validated elsewhere; this service trusts the same identity facts the rest of the platform uses.

Policy vocabulary, bundle layout, and UI entity naming are product concerns documented with the CDP policy bundle ([ADR-0012](../architecture/adrs/0012-ui-capabilities-control-plane.md), [policies/README.md](../policies/README.md)).

## Client objectives

**Product authors** want menu and feature visibility expressed as reviewable policy rather than duplicated conditionals in every screen.

**Operators** need confidence that what people see in the browser matches backend access after each policy bundle release.

**Future deploying products** need one evaluation contract reusable beyond CDP without forking the platform service.

## Workflows

**Menu visibility after login.** Given a person has signed in and chosen a role context, when the application requests UI entitlements for that context, then the service returns which menu areas are permitted and denied, and the application renders navigation from that answer.

**Missing or invalid policy bundle.** Given the service starts without a valid product policy bundle, when an entitlement request arrives, then the service fails closed — no implicit allow — and operators can detect load failure through health and logs.

## Functional requirements

- **FR-001**: The service loads product UI policy from the bundle supplied at deployment. Missing or invalid bundles cause entitlement evaluation to fail closed.

- **FR-002**: For a signed-in person and requested UI namespace, the service returns a map of entitlement keys to permitted or denied outcomes derived from that policy.

- **FR-003**: The service lists which UI namespaces are available from the loaded bundle.

- **FR-004**: Evaluation respects the same role context the person selected in the application session, including org-role assignments established at login.

- **FR-005**: Product-specific menu names and feature keys live in the deploying product’s policy bundle — not hard-coded in this service’s application logic.

- **FR-006**: Unauthenticated callers receive only the unauthenticated liveness response; entitlement evaluation requires a valid signed-in session.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Logs support **measuring** evaluation volume, policy load failures, and request duration without logging personal email addresses or full entitlement maps at routine log levels in production.

- **OR-002**: Production deployments pin a specific product policy bundle version at build time; staging updates when the Capabilities release pipeline publishes a new image with updated pins.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- CDP web application: [019-cdp-web-application.md](019-cdp-web-application.md)
- Authorization distribution spec: [016-authorization-service.md](016-authorization-service.md)
- UI capabilities ADR: [0012-ui-capabilities-control-plane.md](../architecture/adrs/0012-ui-capabilities-control-plane.md)
- CDP policy bundle: [policies/README.md](../policies/README.md)
- Capabilities repo operations: [OPERATIONS.md](https://github.com/Neosofia/capabilities/blob/main/OPERATIONS.md)
- API contract: [openapi.json](https://github.com/Neosofia/capabilities/blob/main/openapi.json)
