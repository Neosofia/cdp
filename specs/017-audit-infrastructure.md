# Audit Infrastructure

## Why we need this

Every service that persists mutable state owes regulators, clinicians, and incident responders a tamper-evident, queryable history of who changed what and when. Hand-rolling audit tables per service produces drift -- inconsistent column sets, forgotten indexes, soft-delete contracts that one team implements and another skips. Investigators then cannot trust cross-service comparisons, and application bugs can skip auditing entirely.

Audit infrastructure exists so the platform has **one authoritative way** to generate consistent before-image history schema in each service database, enforced by the database engine rather than hoping every code path remembers to write a log row. Today that means shared SQL audit templates applied at migration time; tomorrow it may add a read-side central aggregator -- but each service’s `_audit` tables remain the authoritative record either way.

## How this fits into the platform

**SQL audit templates (current scope)** -- Language-agnostic PL/pgSQL and SQL files live in the templates repository. Each service executes them during its platform init migration (`000`), then calls setup helpers when introducing audited tables. Generated objects -- `_audit` tables, triggers, history views, row-level security -- live in that service’s own database under that service’s migration history. There is no shared runtime dependency: if the templates package is unavailable at runtime, the database already enforces auditing.

**Central Audit Service (future scope)** -- When cross-service auditor UI or compliance queries are prioritized, a read-side consumer will aggregate change events from service databases into one queryable store. It will have no write authority back to service schemas; local `_audit` tables stay canonical. That component is stubbed here so activation does not require re-research.

The pattern aligns with [ADR-0004](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0004-full-row-audit-history-over-sparse-deltas.md): full-row snapshots before update or soft-delete, not sparse deltas that require replay to reconstruct state at time T.

## Client objectives

**Service developers** want to opt into auditing by declaring a table -- not copy-paste triggers from a wiki. Migrations should generate matching audit tables, indexes, views, and tear-down scripts that roll back cleanly.

**Auditors and compliance reviewers** want a row’s complete timeline in one ordered result set, timestamps they can trust (database-enforced, not application-forged), and soft-delete semantics that prevent silent hard deletes.

**Incident responders** querying a single service database need indexed range scans on `change_type` and `changed_at` without reconstructing history from partial column deltas.

**Platform operators** (future) will need cross-service views such as “all changes touching patient P in the last 30 days.” That requires the central aggregator described in the future section; v1 delivers per-service consistency first.

## Functional requirements -- SQL audit templates

- **FR-001**: Setup helpers generate an audit table mirroring every column of the target main table with identical types and nullability, plus a time-ordered `history_uuid` surrogate primary key.

- **FR-002**: Audit tables carry no foreign key constraints so history rows survive independently of main-table or related-row lifetime.

- **FR-003**: Audit tables include a composite index on `(change_type, changed_at)` to support time-bounded auditor queries.

- **FR-004**: A before-update trigger copies the full pre-change row to the audit table atomically within the same transaction. If the copy fails, the main transaction aborts.

- **FR-005**: A delete trigger raises an error on direct hard `DELETE`, enforcing soft-delete via `change_type = 3` on update instead.

- **FR-006**: The update path overwrites `changed_at` on the main row to the current database time on every update so applications cannot forge change timestamps.

- **FR-007**: Actor attribution (`changed_by_uuid`, `changed_by_type`) is required on mutating operations -- supplied in the payload or via session variables. Missing attribution halts the transaction.

- **FR-008**: Insert rows appear on the main table only with `change_type = 1`; no audit row is written for insert because the main row is the initial state.

- **FR-009**: A history view unions current main-table rows with audit rows, ordered by primary key then `changed_at`, presenting a single chronological timeline. Current rows expose `history_uuid` as null; historical rows populate it.

- **FR-010**: Row-level security on main tables hides soft-deleted rows (`change_type = 3`) from standard application queries. An authorized session escape hatch allows auditor queries to include deleted rows when explicitly enabled.

- **FR-011**: Tear-down templates reverse setup exactly so migrations roll back without orphaned triggers or views.

- **FR-012**: Generated DDL is framework-agnostic standard SQL executable by any service migration runner (Alembic, Rails, SQLx, and similar).

- **FR-013**: The application database role cannot write directly to `_audit` tables; only trigger machinery appends audit rows.

- **FR-014**: Trigger exception messages do not surface PHI.

- **FR-015**: Schema generation logic is covered by tests against a real database instance -- not mocks alone -- so generated triggers and constraints behave as intended.

- **FR-016**: Template package versioning follows semver; breaking changes to generated schema require a major version bump.

## Platform audit pattern (canonical reference)

Every mutable main table participating in this pattern includes:

| Column | Purpose |
|--------|---------|
| `changed_at` | Last change timestamp; overwritten to `now()` on update by trigger |
| `change_type` | `1` insert, `2` update, `3` soft-delete; constrained to that set |

Behaviour summary:

| Operation | Main table | Audit table |
|-----------|------------|-------------|
| Insert | Row created with `change_type = 1` | No audit row |
| Update | Row updated; trigger sets `change_type = 2`, fresh `changed_at` | Pre-change row copied |
| Soft delete | `change_type = 3`, fresh `changed_at` | Pre-change row copied |
| Hard delete | Prohibited -- trigger error | -- |

Application queries against main tables exclude soft-deleted rows via RLS (or equivalent filter where RLS is not used). Main tables also carry `(change_type, changed_at)` indexing for auditor range scans.

Services adopt templates on first migration that introduces audited tables. Reference implementation tables in the Authentication Service (`user_sessions`, `refresh_tokens`, `machine_credentials` and their `_audit` / `_history` pairs) validate parity when migrating hand-rolled schema to template-generated SQL.

## Functional requirements -- Central Audit Service (future)

These requirements apply when an auditor UI or cross-service compliance query is prioritized; they are not in v1 delivery scope.

- **FR-101**: The central service consumes change events from service databases via CDC or an outbox/notify pattern. It normalizes events into a canonical envelope and writes an append-only aggregated store.

- **FR-102**: The central service exposes a read API for auditor tooling. No service calls this API in the online request path.

- **FR-103**: The central service is consumer-only: no schema authority over service databases, no write-back, no modification or deletion of source audit records.

- **FR-104**: Each service’s local `_audit` tables remain the authoritative record if the aggregator and source disagree.

- **FR-105**: Event payloads on the aggregation path carry identifiers and metadata only -- not clinical narrative or other PHI beyond what compliance explicitly requires in the aggregated store.

Activation trigger: an auditor UI feature is prioritized, or compliance mandates cross-service audit queries within a defined SLA. Deferred decisions include CDC versus outbox transport, aggregated storage backend, retention policy, and query API shape.

## Operational requirements

- **OR-001**: Template releases are pinned in service build images the same way other platform template artifacts are pinned, so production schema generation is reproducible.

- **OR-002**: Operators can verify adoption per service (init migration applied, audited tables registered) without querying row contents.

- **OR-003**: When the central service exists, its consumers are observable separately from OLTP traffic -- lag, error rate, and backlog -- without duplicating SLO numbers in this spec; thresholds live in operational tooling.

## Further reading

- Full-row audit ADR: [0004-full-row-audit-history-over-sparse-deltas.md](https://github.com/Neosofia/cdp/blob/main/architecture/adrs/0004-full-row-audit-history-over-sparse-deltas.md)
- SQL audit templates: [templates/sql/audit](https://github.com/Neosofia/templates/tree/main/sql/audit)
- Authentication service (reference tables): [014-authentication-service.md](https://github.com/Neosofia/cdp/blob/main/specs/014-authentication-service.md)
- User service spec: [018-user-service.md](https://github.com/Neosofia/cdp/blob/main/specs/018-user-service.md)
- Platform operational metrics: [011-operational-metrics.md](https://github.com/Neosofia/cdp/blob/main/specs/011-operational-metrics.md)
