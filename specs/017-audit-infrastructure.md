# Audit Infrastructure

## Why we need this capability

Every service that persists mutable state owes regulators, clinicians, and incident responders a tamper-evident, queryable history of who changed what and when. Hand-rolling audit tables per service produces drift — inconsistent columns, forgotten indexes, soft-delete semantics one team implements and another skips. Investigators then cannot trust cross-service comparisons, and application bugs can skip auditing entirely.

Audit infrastructure exists so the platform has **one authoritative way** to generate consistent before-image history in each service database, enforced by the database engine rather than hoping every code path remembers to write a log row. v1 delivers shared SQL audit templates applied at migration time. Each service’s `_audit` tables are the authoritative record; history is read through **that service’s APIs**, not a central aggregator.

## How this capability fits into the platform

**SQL audit templates (v1)** — Language-agnostic SQL and PL/pgSQL live in the templates repository. Each service executes them during platform init migration, then registers audited tables through setup helpers. Generated objects — `_audit` tables, triggers, `_history` views, and protection hooks — live in that service’s own database under that service’s migration history. There is no shared runtime dependency: once migrations run, the database enforces auditing even if the templates package is unavailable at runtime.

**Federated audit reads** — Services that expose history publish read APIs on the owning service (for example authentication service registry audits, user registry audits, care-episode clinical audits). The CDP web application and other clients call whichever APIs the signed-in principal is permitted to use. There is **no central audit service** and no cross-service aggregation layer.

**Who sees which audits** — Access to each audit category is enforced by **platform authorization** ([016-authorization-service.md](016-authorization-service.md)). Product teams define Cedar permits per service and audit type. An operator role may view service-registry and credential history but not clinical episode history; a clinician may view assigned-patient clinical audits but not platform credential rotation — according to product policy, not a single global feed.

The pattern aligns with [ADR-0004](../architecture/adrs/0004-full-row-audit-history-over-sparse-deltas.md): full-row snapshots before update or soft-delete, not sparse deltas that require replay to reconstruct state at time T.

## Client objectives

**Service developers** want to opt into auditing by declaring a table — not copy-paste triggers from a wiki. Migrations should generate matching audit tables, indexes, views, and tear-down scripts that roll back cleanly.

**Auditors and compliance reviewers** want a row’s complete timeline in one ordered result set, timestamps they can trust (database-enforced, not application-forged), and soft-delete semantics that prevent silent hard deletes.

**Incident responders** querying a single service database need indexed range scans on `change_type` and `changed_at` without reconstructing history from partial column deltas.

**Platform operators, clinicians, and administrators** need audit history for the domains their role may access — service registry changes, user assignments, clinical episode lifecycle, and similar — each served by the owning service and gated by that service’s policy.

**Product authors** want to configure which roles may list or drill into each audit category without building a separate permission matrix outside Cedar.

## Workflows

**Register an audited table.** Given a service has applied platform init audit templates, when a migration calls the setup helper for a mutable main table, then matching `_audit` schema, triggers, and `_history` view are created and tear-down helpers can reverse the setup exactly.

**Capture an update.** Given an authorised update includes actor attribution (`changed_by_uuid`, `changed_by_type`), when the row changes, then the complete pre-change row is copied to `_audit` in the same transaction, `changed_at` is set by the database, and missing attribution aborts the transaction with no partial write.

**Soft-delete a row.** Given an authorised update sets soft-delete (`change_type = 3`), when the transaction commits, then the last active state and tombstone are archived to `_audit`, the live row is removed from the main table, and a direct hard `DELETE` remains prohibited.

**Review entity history.** Given a principal authorised for that audit action queries history for an entity on the owning service, when results are ordered by primary key and `changed_at`, then they see a single chronological timeline from creation through updates to the current live row or archived tombstone — without replaying sparse deltas.

**Denied audit access.** Given a principal is not permitted to view a given audit category, when they request history from the owning service, then the service denies the request without exposing whether history exists for the target.

## Functional requirements — SQL audit templates (v1)

- **FR-001**: Setup helpers generate an `_audit` table mirroring every column of the target main table with identical types and nullability, plus a time-ordered `history_uuid` surrogate primary key.

- **FR-002**: Audit tables carry no foreign key constraints so history rows survive independently of main-table or related-row lifetime.

- **FR-003**: Audit tables include a composite index on `(change_type, changed_at)` to support time-bounded auditor queries. Main tables expose the same index pattern where range scans on live rows are needed.

- **FR-004**: A before-update trigger copies the full pre-change row to the `_audit` table atomically within the same transaction. If the copy fails, the main transaction aborts.

- **FR-005**: A delete trigger raises an error on direct hard `DELETE`, enforcing soft-delete via `change_type = 3` on update instead. Internal archive-on-delete uses a session flag so the trigger can remove the live row after archiving without treating it as an application-initiated hard delete.

- **FR-006**: The update path overwrites `changed_at` on the main row to the current database time on every update so applications cannot forge change timestamps.

- **FR-007**: Actor attribution (`changed_by_uuid`, `changed_by_type`) is required on mutating operations — supplied in the payload or via session variables. Missing attribution halts the transaction.

- **FR-008**: Insert rows appear on the main table only with `change_type = 1`; no audit row is written for insert because the main row is the initial state.

- **FR-009**: A `_history` view unions current main-table rows with `_audit` rows. Live rows expose `history_uuid` as null; archived rows populate it. The view presents a single chronological timeline when ordered by primary key and `changed_at`.

- **FR-010**: Soft-deleted entities no longer appear on the main table after commit; tombstone and prior states remain in `_audit` and are readable through `_history`. Row-level security is not part of this pattern — visibility is enforced by service authorization on history read APIs.

- **FR-011**: Tear-down templates reverse setup exactly so migrations roll back without orphaned triggers or views.

- **FR-012**: Generated DDL is framework-agnostic standard SQL executable by any service migration runner (Alembic, Rails, SQLx, and similar).

- **FR-013**: The application database role cannot write directly to `_audit` tables; only trigger machinery appends audit rows. Read access to `_audit` and `_history` is granted explicitly for authorised service queries.

- **FR-014**: Trigger exception messages do not surface PHI.

- **FR-015**: Schema generation logic is covered by tests against a real database instance — not mocks alone — so generated triggers and constraints behave as intended.

- **FR-016**: Template package versioning follows semver; breaking changes to generated schema require a major version bump.

## Functional requirements — audit read access

- **FR-017**: Services that expose audit history do so through published read APIs on the **owning service**. Clients do not read another service’s `_audit` tables directly.

- **FR-018**: Each audit read API is protected by that service’s Cedar policy. Product teams define which roles and actions may list or drill into each audit category (for example service registry, user registry, clinical episode).

- **FR-019**: Audit responses use opaque identifiers and structured metadata appropriate to the audit domain. Clinical narrative and other sensitive payload fields do not appear in audit APIs unless the owning service spec explicitly requires them for authorised readers.

## Operational requirements

This capability is not a deployable HTTP service. Services that adopt audit templates satisfy platform baseline through their own specs ([000-platform-baseline.md](000-platform-baseline.md)).

- **OR-001**: Operators can **deploy** template releases by pinning them in service build images the same way other platform template artifacts are pinned, so production schema generation is reproducible.

- **OR-002**: Operators can **verify** adoption per service — init migration applied, audited tables registered — without querying row contents or PHI.

## Audit pattern (reference)

Every mutable main table participating in this pattern includes:

| Column | Purpose |
|--------|---------|
| `changed_at` | Last change timestamp; overwritten to database time on update by trigger |
| `change_type` | `1` insert, `2` update, `3` soft-delete; constrained to that set |
| `changed_by_uuid` | Opaque actor identifier (human or service principal) |
| `changed_by_type` | `1` human, `2` service |

Behaviour summary:

| Operation | Main table | Audit table |
|-----------|------------|-------------|
| Insert | Row created with `change_type = 1` | No audit row |
| Update | Row updated; trigger sets `change_type = 2`, fresh `changed_at` | Pre-change row copied |
| Soft delete | Tombstone archived; live row removed after archive | Last active state and tombstone copied |
| Hard delete | Prohibited — trigger error | — |

Services adopt templates on first migration that introduces audited tables. Reference implementation tables in the Authentication Service (`user_sessions`, `refresh_tokens`, `machine_credentials` and their `_audit` / `_history` pairs) validate parity when migrating hand-rolled schema to template-generated SQL.

## Further reading

- Full-row audit ADR: [0004-full-row-audit-history-over-sparse-deltas.md](../architecture/adrs/0004-full-row-audit-history-over-sparse-deltas.md)
- Platform authorization: [016-authorization-service.md](016-authorization-service.md)
- SQL audit templates: [templates/sql/audit](https://github.com/Neosofia/templates/tree/main/sql/audit)
- Authentication service (reference tables): [014-authentication-service.md](014-authentication-service.md)
- User service spec: [018-user-service.md](018-user-service.md)
- Care Episode service spec: [015-care-episode-service.md](015-care-episode-service.md)
- Platform baseline: [000-platform-baseline.md](000-platform-baseline.md)
- Platform operational metrics: [011-operational-metrics.md](011-operational-metrics.md)
