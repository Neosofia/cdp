# User Service

## Why we need this service

Every person using the platform has two distinct questions attached to them: *who are they*, and *what are they allowed to do here*. Login answers the first -- name, organisation, and broad actor type (operator, clinician, patient). That is not enough to run a multi-service product. A clinician may be a staff nurse, a trial coordinator, and a quality reviewer at the same time. An operator may administer the mesh or only read audits. Those job functions change over time, must be assignable by authorised staff, and must be auditable.

Without a dedicated user registry, each service would invent its own role strings, admin screens would disagree on who holds which privilege, and authorization would drift. The User Service exists so the platform has **one authoritative place** to record which platform roles each human principal holds, who changed them, and the identity fields needed to administer that registry -- while leaving login, tenant metadata, and clinical domain state to the services that own those concerns.

## How this service fits into the platform

The platform separates **identity** from **platform roles**. After login, the Authentication Service attests who the person is and issues a short-lived token carrying broad actor class. The User Service holds **Tier-2 platform roles** -- dotted job functions such as `operator.platform-admin` or `clinical.function.staff-nurse` -- on a registry row keyed by the same platform user identifier carried in the token. Downstream APIs and admin experiences consult this registry (directly or via their own authorization rules) when they need to know *what jobs* someone performs, not merely *what kind* of principal they are.

The registry is intentionally narrow. It does not issue tokens, run the identity-provider login flow, store organisation display names, or model site, trial, or care-episode scope -- those belong elsewhere. Human rows appear when Authentication synchronises identity after login; operators manage roles through admin tooling; end users may update a limited subset of their own profile fields. Products deployed on the platform (for example CDP) may extend the role catalog with domain-specific slugs without forking the core service.

## Client objectives

**User administrators** do not want to run a user-provisioning desk. They want the platform to do the right thing when someone logs in -- create or refresh the registry record automatically -- and only involve them when access needs to change. When a role assignment is wrong or outdated, they need to find the right person quickly and update their platform roles, for one person or many, without a separate onboarding workflow or duplicate identity stores.

**Every end user** wants their profile to reflect reality. If a name is misspelled or contact details changed, they should be able to fix what is wrong on their own record without opening a ticket -- and without being able to grant themselves privileges they were never given.

**Deploying products** (for example CDP) need a generic role vocabulary that works on any vertical, plus the ability to add their own domain-specific roles at deploy time so clinical, research, or other specialised slugs live with the product, not in the core platform catalog.

**Downstream services** need one place to answer “what jobs does this person perform?” -- distinct from the coarse actor class on the login token -- so authorization stays consistent across the mesh.

## Functional requirements

- **FR-001**: The service maintains a registry of human principals per tenant, keyed by the same platform user identifier created by the authentication service on first login. A shared key ties the registry to login identity without this service minting its own user ids.

- **FR-002**: Each registry record stores stable identity-provider subject id, tenant reference, name, email, and an assignable set of platform roles. Actor class is not stored on the record; it is stored in the external IDP, and job functions stay where administrators manage them.

- **FR-003**: Platform roles use a stable dotted naming scheme (`branch.category.slug`) so roles are human-readable in admin UI, logs, and policy -- a person can scan `clinical.function.staff-nurse` and understand it without a lookup table. Site, trial, and other domain scope are not encoded in role strings; scope belongs in domain services where context can change independently of job title.

- **FR-004**: The service exposes a role catalog for assignment pickers and validation. The catalog includes a generic default suitable for multiple industries (fintech, edutech, and similar) and supports an optional deploy-time overlay so products add domain-specific roles without forking the service -- the same pattern as bringing your own policy bundles.

- **FR-005**: Assignment of platform roles is constrained by the assigner’s actor class (from the login token) so a clinician cannot grant operator privileges and a patient cannot grant clinical roles -- even if they can edit their own name.

- **FR-006**: Operators can search and list registry records for their tenant, open a record, update role assignments and permitted profile fields, and view audit history. The same flows extend to updating roles for multiple principals when an administrative experience requires batch change -- find the people, fix access, move on.

- **FR-007**: End users can read their own registry record and update only the profile fields explicitly allowed by policy. Self-service fixes typos and stale contact info; self-service cannot elevate platform roles.

- **FR-008**: The service does not expose a public “create user” API for operators. New registry rows appear when Authentication synchronises identity after login -- administrators manage access, not account existence. Identity fields refreshed on later logins do not overwrite operator-assigned platform roles, so a login sync never silently revokes or reshapes deliberate role decisions.

- **FR-009**: Every create, update, and delete on registry data appends a full-row audit history entry. Compliance and incident review need to know who changed what, not merely that a row changed.

- **FR-010**: All registry and catalog access requires a valid human platform token except an unauthenticated health check. Authorization is evaluated in service policy before business logic so denied requests fail closed.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)). Log payloads must not include names, emails, role strings, or raw identifiers.

- **OR-001**: Logs support **measuring** registry behaviour and changes. At minimum:

  - Classifying request outcomes and errors by endpoint
  - Attributing request duration by endpoint
  - Counting registry users created
  - Counting registry users updated

- **OR-002**: Products that rely on domain-specific roles supply a catalog overlay as part of their deployment. The core service ships and runs with the generic default alone so non-clinical deployments are not burdened with clinical vocabulary.

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Role model: [authentication#11](https://github.com/Neosofia/authentication/issues/11)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- API contract: [openapi.json](https://github.com/Neosofia/user/blob/main/openapi.json)
- Security and authorization: [SECURITY.md](https://github.com/Neosofia/user/blob/main/SECURITY.md)
