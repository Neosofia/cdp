# User Service

## Why we need this service

Every person using the platform has two distinct questions attached to them: *who are they*, and *what are they allowed to do in this organisation*. Login answers the first -- name, tenant, and broad actor class (operator, clinician, patient). That is not enough to run a multi-service product. An operator may administer the mesh or only read audits; a CRO user may be an admin, clinical ops, or read-only within their org kind. Those assignments change over time, must be grantable only by authorised staff, and must be auditable.

Without a dedicated user registry, each service would invent its own role strings, admin screens would disagree on who holds which privilege, and authorization would drift. The User Service exists so the platform has **one authoritative place** to record which roles each human principal holds within their organisation type, who changed them, and the identity fields needed to administer that registry -- while leaving login, organisation metadata, and clinical domain state to the services that own those concerns.

## How this service fits into the platform

The platform separates **identity** from **org-level permissions**. After login, the Authentication Service attests who the person is and which broad actor classes apply. This service holds the registry of **roles** -- the smaller set of admin and functional hats someone wears within their organisation type (for example platform admin versus audit-only, or CRO clinical ops versus read-only). Downstream products consult this registry when administering users; authorization at API boundaries uses service policy described in the security document and [ADR-0014](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0014-tenant-types-and-org-roles.md).

The registry is intentionally narrow. It does not issue tokens, run the identity-provider login flow, store organisation display names, or model site, trial, or care-episode scope. Human rows appear when Authentication synchronises identity after login; operators manage roles through admin tooling; end users may update a limited subset of their own profile fields. Products deployed on the platform (for example CDP) may extend the role catalog with domain-specific vocabulary at deploy time without forking the core service. Fine-grained job titles may appear in the catalog for labels and future scope; they are not the primary authorization vocabulary.

## Client objectives

**User administrators** do not want to run a user-provisioning desk. They want the platform to create or refresh the registry record automatically when someone logs in, and only involve them when access must change. When a role assignment is wrong or outdated, they need to find the right person quickly and update roles for one person or many, without duplicate identity stores.

**Every end user** wants their profile to reflect reality. If a name is misspelled or contact details changed, they should be able to fix what is wrong on their own record without opening a ticket -- and without being able to grant themselves privileges they were never given.

**Deploying products** (for example CDP) need a generic role vocabulary that works on any vertical, plus the ability to add their own domain-specific roles at deploy time so clinical, research, or other specialised labels live with the product, not in the core platform catalog.

**Downstream services** need one consistent place to answer “what roles does this person hold?” -- distinct from the coarse actor class established at login -- so authorization stays aligned across the mesh.

## Functional requirements

- **FR-001**: The service maintains a registry of human principals per tenant, keyed by the same platform user identifier created by the authentication service on first login. A shared key ties the registry to login identity without this service minting its own user ids.

- **FR-002**: Each registry record stores stable identity-provider subject id, tenant reference, name, email, and an assignable set of roles. Broad actor class and organisation type are not duplicated on the row; they are established at login and in tenant metadata owned elsewhere.

- **FR-003**: Roles use a stable, human-readable naming scheme scoped to organisation type so administrators and auditors can understand assignments without a private lookup table. Site, trial, and other domain scope are not encoded in role strings; scope belongs in domain services where context can change independently of role assignment.

- **FR-004**: The service exposes a role catalog for assignment pickers and validation. The catalog includes a generic default suitable for multiple industries and supports an optional deploy-time overlay so products add domain-specific entries without forking the service.

- **FR-005**: Assignment of roles is constrained by the assigner's actor class so a clinician cannot grant operator privileges and a patient cannot grant clinical roles -- even if they can edit permitted profile fields on their own row.

- **FR-006**: Authorised administrators can search and list registry records for their tenant, open a record, update role assignments and permitted profile fields, and view audit history. The same flows extend to multiple principals when an administrative experience requires batch change.

- **FR-007**: End users can read their own registry record and update only the profile fields explicitly allowed by policy. Self-service fixes typos and stale contact info; self-service cannot elevate roles.

- **FR-008**: The service does not expose a public “create user” API for operators. New registry rows appear when Authentication synchronises identity after login. Identity fields refreshed on later logins do not overwrite operator-assigned roles, so login sync never silently revokes deliberate role decisions.

- **FR-009**: Every create, update, and delete on registry data appends a full-row audit history entry. Compliance and incident review need to know who changed what, not merely that a row changed.

- **FR-010**: Registry and catalog access requires a valid platform token except an unauthenticated health check. Human registry actions use human tokens; login-time provisioning uses an authentication service token. Authorization is evaluated in service policy before business logic so denied requests fail closed.

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)). Log payloads must not include names, emails, role strings, or raw identifiers.

- **OR-001**: Logs support **measuring** registry behaviour and changes. At minimum:

  - Classifying request outcomes and errors by endpoint
  - Attributing request duration by endpoint
  - Counting registry users created
  - Counting registry users updated

- **OR-002**: Products that rely on domain-specific catalog entries supply a role overlay as part of their deployment. The core service ships and runs with the generic default alone so non-clinical deployments are not burdened with clinical vocabulary.

## Illustrative vocabulary (examples)

The catalog groups assignable roles by **organisation type** (platform operator, CRO, sponsor, site, SMO, patient-facing). Each role is a short admin or functional hat within that type -- for example platform **admin** versus **audit-only**, or CRO **clinical-ops** versus **read-only**. Assignments are stored as readable combined slugs such as `cro.clinical-ops`; administrators see labels from the catalog API, not internal codes.

**Examples (v1, not exhaustive):**

| Organisation type | Example roles |
|-------------------|---------------|
| Platform operator | Administer the mesh; read audits without assignment power |
| CRO | Admin, clinical operations, systems, monitoring, read-only |
| Sponsor | Admin, clinical operations, systems, oversight, read-only |
| Investigator site | Admin, research, clinical care, read-only |
| Site management org | Admin, activation, read-only |
| Patient-facing org | Self-service; advocate / caregiver |

The authoritative list, assigner rules (which actor classes may grant which types), and deploy-time product vocabulary live in the User service role catalog. CDP labels and UI vocabulary: [policies/user/role-catalog.json](../policies/user/role-catalog.json) ([policies/README.md](../policies/README.md)). Platform base: [user/roles/default.json](https://github.com/Neosofia/user/blob/main/roles/default.json).

## Further reading

- Platform baseline: [000-platform-baseline.md](https://github.com/Neosofia/cdp/blob/main/specs/000-platform-baseline.md)
- Tenant types and roles: [ADR-0014](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0014-tenant-types-and-org-roles.md)
- Role catalog vocabulary: [user/roles/README.md](https://github.com/Neosofia/user/blob/main/roles/README.md) (platform base); CDP product catalog: [policies/README.md](../policies/README.md)
- Authentication service spec: [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
- API contract: [openapi.json](https://github.com/Neosofia/user/blob/main/openapi.json)
- Security and authorization: [SECURITY.md](https://github.com/Neosofia/user/blob/main/SECURITY.md)
