# CDP Web Application

## Why we need this application

Patients, clinicians, and operators need one trustworthy browser experience for post-discharge care — not separate native apps, SMS threads, or admin consoles that disagree about roles and navigation. The CDP web application is the **single responsive browser product** for v1: people switch role context in the same shell to reach patient chat, clinician workspace, or operator administration.

Native mobile applications, SMS chat, and push notifications are out of scope for v1 ([ADR-0018](../architecture/adrs/0018-streamlined-v1-product-scope.md)). The experience must still work well on phone-sized browsers because patients and clinicians may use the product on a device in hand.

## How this application fits into the platform

After login, the platform knows who the person is and which org roles they hold. The application asks the Capabilities service which menus and screens that person may see, then lets them choose **one active role context at a time** for the session — patient, clinician, operator, study participant, or demo — so every action runs with a single clear hat ([ADR-0010](../architecture/adrs/0010-single-active-role-ui.md), [ADR-0014](../architecture/adrs/0014-tenant-types-and-org-roles.md), [020-capabilities-service.md](020-capabilities-service.md)).

Patient chat goes through Care Episode for the full turn — thread, care-assistant reply, and risk outcome — not by calling the message store directly ([015-care-episode-service.md](015-care-episode-service.md)). Operators see whether platform services are reachable from the same application they use to administer the mesh. Two visual themes — corporate and neon — share routes and capabilities. Terms of service acceptance gates demo onboarding and certain operator flows.

Browser-to-service connectivity, staging deployment, and token refresh behaviour are documented in architecture decisions and operations guides — not repeated here ([ADR-0013](../architecture/adrs/0013-defer-same-origin-api-proxy-for-ui.md), [ADR-0017](../architecture/adrs/0017-railway-staging-auto-deploy.md), [OPERATIONS.md](../OPERATIONS.md)).

## Client objectives

**Patients** want to chat with the care assistant, see conversation history, and review profile and records without installing an app from an app store.

**Clinicians** want a roster ordered by severity, patient detail with chat and records together, and the ability to join a thread as the care team.

**Operators** want service health, recent audit activity, user administration, and service registry management in one place.

**Platform owners** want one deployable browser product whose staging updates follow the same quality gate as backend services.

## Workflows

**Switch role context.** Given a signed-in person holds more than one assigned role, when they choose a different role from the profile menu, then navigation, menus, and subsequent actions reflect that role only until they switch again.

**Patient chat turn.** Given a patient with an active recovery sends a message in chat, when the send completes, then they see the care-assistant reply for that turn and the thread updates without them managing recovery or thread identifiers manually.

**Operator checks platform health.** Given an operator opens the administration dashboard, when the panel loads, then they see reachability and latency for each configured platform service and can refresh the view on demand.

## Functional requirements

- **FR-001**: The application provides distinct primary navigation for patient, clinician, operator, and study experiences. Visible menus reflect evaluated entitlements — not hard-coded role strings in the client alone.

- **FR-002**: The profile menu lists assigned org roles mapped to role contexts. Selecting one updates the active session context and remembers the choice locally. Only one role context is active at a time.

- **FR-003**: Patient chat supports multiple conversation threads, clear send feedback, and care-assistant replies returned from the Care Episode path for each turn.

- **FR-004**: Clinician views show active patients, recovery severity, recent chat activity, and drill-down to chat plus medical record panels for a selected patient.

- **FR-005**: Operator views show aggregate registry statistics, per-service health status, credential rotation indicators where applicable, and recent audit activity from platform services.

- **FR-006**: Demo onboarding runs only after terms acceptance for people permitted to use the demo experience, preparing tenant, roles, sample patients, and a personal recovery through coordinated platform flows documented for operators.

- **FR-007**: The application refreshes login continuity before sessions expire and retries once when the platform rejects a call as unauthenticated, without surfacing raw credential material to the user.

- **FR-008**: Primary interactive surfaces meet platform baseline accessibility and responsive layout requirements ([000-platform-baseline.md](000-platform-baseline.md) FR-004 through FR-006).

## Operational requirements

Platform baseline applies ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: The application displays a dated release identifier in product footer and changelog convention agreed for the CDP product.

- **OR-002**: Staging deployment follows the platform staging auto-deploy model once quality checks pass ([ADR-0017](../architecture/adrs/0017-railway-staging-auto-deploy.md)).

- **OR-003**: Automated checks exercise primary patient chat and clinician roster flows at mobile and desktop layout sizes before release, satisfying baseline OR-004.

## Further reading

- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Care Episode Service: [015-care-episode-service.md](015-care-episode-service.md)
- Capabilities Service: [020-capabilities-service.md](020-capabilities-service.md)
- Authentication service spec: [014-authentication-service.md](014-authentication-service.md)
- Single active role ADR: [0010-single-active-role-ui.md](../architecture/adrs/0010-single-active-role-ui.md)
- Tenant types and org roles ADR: [0014-tenant-types-and-org-roles.md](../architecture/adrs/0014-tenant-types-and-org-roles.md)
- Cross-origin browser topology ADR: [0013-defer-same-origin-api-proxy-for-ui.md](../architecture/adrs/0013-defer-same-origin-api-proxy-for-ui.md)
- Staging deploy ADR: [0017-railway-staging-auto-deploy.md](../architecture/adrs/0017-railway-staging-auto-deploy.md)
- CDP operations: [OPERATIONS.md](../OPERATIONS.md)
