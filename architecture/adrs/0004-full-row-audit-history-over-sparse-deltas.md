# 04. Store Full Row Snapshots in Audit History Tables, Not Sparse Deltas

Date: 2026-04-19

## Status

Accepted

## Context

Every service that persists mutable state needs an audit trail for HIPAA compliance, clinical-safety investigations, and operational debugging. Two patterns exist for capturing change history:

1. **Full-row snapshot** — on every UPDATE or DELETE, a copy of the entire pre-change row is written to a paired `_audit` table. Each history record is self-contained.

2. **Sparse delta** — only the columns that changed are written. The history table schema uses nullable columns for every field, and reconstructing the row at time T requires replaying all deltas from the initial insert.

The auth service (`014-authentication-service`) was the first service to adopt an audit strategy, using database triggers to copy full rows into `_audit` tables. As additional services are designed, a consistent platform-wide pattern must be established.

## Decision

All CDP services that use the before-image history table pattern MUST store full-row snapshots, not sparse deltas.

- On UPDATE: the complete pre-change row is copied atomically to the `_audit` table via a `BEFORE UPDATE` trigger.
- On DELETE (soft): `change_type` is set to `3` on the main table row; the pre-change row is copied to `_audit` as usual.
- The `_audit` table schema mirrors the main table schema exactly, plus a `history_uuid` UUIDv7 surrogate primary key.

## Rationale

**Query simplicity.** The dominant audit query is "what did this row look like at time T?" Full-row snapshots answer this with a single indexed lookup. Sparse deltas require replaying N records from the beginning, which is complex to implement correctly and degrades with history depth.

**Diff at read time, not write time.** Identifying which columns changed between two history entries is done by comparing consecutive full rows in application code or a view. This is trivially correct. Computing deltas at write time requires column-by-column comparison inside the trigger, couples the trigger tightly to the schema, and makes every column in the audit table nullable — increasing schema complexity without a meaningful gain.

**Storage is not a constraint at CDP's scale.** Auth service table rows are narrow (~200 bytes). Even at high write volumes, full-row history storage is negligible before Postgres compression. If a future service has genuinely wide tables (50+ columns) or high-frequency telemetry workloads, a new ADR should be raised to evaluate sparse deltas or a columnar store for that specific case.

**Trigger simplicity and correctness.** A full-row copy trigger is ~10 lines of PL/pgSQL with no conditional logic. It is easy to read, test, and verify. A sparse delta trigger must enumerate columns and conditionally include fields — significantly more complex and a source of bugs.

## Consequences

- All `_audit` tables mirror the full schema of their main table plus `history_uuid`. No nullable-everything schemas.
- The `cdp-audit` shared package (forward reference in `014-authentication-service/data-model.md`) must generate full-row triggers, not delta triggers.
- Services with very wide tables (≥50 meaningful columns) or blob/large-text columns that rarely change should raise a new ADR before adopting this pattern, as the storage trade-off changes significantly in those cases.
- History reconstruction is O(1): `SELECT * FROM <table>_audit WHERE <pk> = $1 AND changed_at <= $2 ORDER BY changed_at DESC LIMIT 1`.
- Consumers of history data (audit UI, central audit service) can diff any two consecutive rows without additional infrastructure.
