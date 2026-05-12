# Feature Specification: Audit Infrastructure

**Feature Branch**: `017-audit-infrastructure`
**Created**: April 19, 2026
**Status**: Draft — v1 scope is `cdp-audit` generator only; Central Audit Service is stubbed for future

---

## Overview

Every CDP service that persists mutable state must produce a tamper-evident, queryable audit trail as a platform-wide HIPAA and clinical-safety obligation. Two components deliver this:

1. **`cdp-audit` generator** *(v1 scope)* — A language-agnostic tool/generator that produces, at schema migration time, the SQL for audit tables, history views, composite indexes, and triggers that enforce the [before-image history table pattern](../../architecture/structurizr/decisions/0004-full-row-audit-history-over-sparse-deltas.md). Services depend on it as a migration-time utility; all generated schema objects live in each service's own database under that service's own framework-idiomatic migration history. There is no shared runtime dependency.

2. **Central Audit Service** *(future / out of scope for v1)* — A read-side CDC consumer that aggregates audit events across service databases into a single queryable store for cross-service audit queries and auditor UI support. It has no authority over any service's schema and writes nothing back to service databases.

The split is intentional: `cdp-audit` ensures consistent schema generation today; the Central Audit Service adds cross-service querying when that UI is prioritized.

---

## Part 1: `cdp-audit` Schema Generator

### Purpose

Hand-rolling audit tables, triggers, and views per service produces drift: subtle schema differences, inconsistent index names, forgotten `change_type` checks. The `cdp-audit` generator provides a language-agnostic, single authoritative implementation consumed by every service's schema migrations.

The generator is a **migration-time tool only**. It produces raw, framework-agnostic SQL, ensuring that any service—whether built in Python, Rust, Rails, or otherwise—can execute the exact same authoritative audit triggers. Each service database remains self-contained — the generated schema objects live in the service's own database and are tracked in the service's own migration history.

### Contract

The generator accepts a table definition (name, columns, types) and generates all required SQL statements in the correct dependency order. Corresponding tear-down templates reverse each operation exactly, enabling safe migration rollback.

### What the Library Generates

#### Audit table

Creates `<table>_audit` mirroring the full column set of `<table>` plus:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `history_uuid` | UUID | PK, default: time-ordered UUID | Surrogate key for the audit row; ordering proxy is `changed_at` |

All columns from the main table are reproduced verbatim (same types, nullability, defaults). The audit table has **no foreign keys** — history rows must survive independent of main-table row lifetime.

The composite index `(change_type, changed_at)` is also created on the audit table to support auditor UI range queries against history.

#### Audit triggers

Attaches three database-enforced triggers to `<table>`:

- **`BEFORE UPDATE`** — copies the pre-change row to `<table>_audit` before applying the update
- **`BEFORE DELETE`** — raises a database-level error with message `"Direct DELETE on <table> is prohibited; set change_type = 3 to soft-delete"`. Hard deletes are not permitted.
- **`AFTER INSERT`** — no-op; INSERT rows are visible on the main table only. The `change_type = 1` default records the initial state.

The UPDATE trigger sets `changed_at = now()` on the incoming row before it is written, ensuring `changed_at` always reflects the actual write time regardless of application-provided values.

#### History view

Creates the view `<table>_history` as the union of current rows and all historical rows, ordered by primary key then change timestamp.

The view provides a complete ordered timeline of all states a row has passed through. `history_uuid` is `NULL` for current main-table rows and populated for audit rows.

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | The audit table MUST reproduce every column from the target table with identical types and nullability |
| FR-002 | The audit table MUST NOT carry foreign key constraints — history rows must survive independent of main-table row lifetime |
| FR-003 | The audit table MUST have a `(change_type, changed_at)` composite index to support auditor UI range queries |
| FR-004 | The pre-update trigger MUST copy the full pre-change row to the audit table atomically within the same transaction |
| FR-005 | The delete trigger MUST raise an error on any direct hard delete, enforcing the soft-delete contract |
| FR-006 | The update trigger MUST override `changed_at` to the current database time on every UPDATE, preventing application code from forging change timestamps |
| FR-007 | The history view MUST present current and historical rows in a single ordered result set, sorted by primary key then change timestamp |
| FR-008 | All tear-down operations MUST be exact inverses of their corresponding setup operations |
| FR-009 | The generator MUST produce framework-agnostic, standard SQL DDL that can be executed by any target language |

### Security Requirements

| ID | Requirement |
|----|-------------|
| SC-001 | Audit tables MUST NOT be directly writable by the application database user; only the database-enforced trigger mechanism may write to `_audit` tables |
| SC-002 | No PHI may be logged or surfaced in trigger exception messages |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-001 | The library must have 100% test coverage for all schema-generation logic; tests MUST run against a real database instance (not mocks) to validate generated schema correctness |
| NF-002 | Generated schema objects must be idempotent within a single migration run (no duplicate object errors on retry) |
| NF-003 | Package versioning follows semver; breaking changes to generated schema require a major version bump |

### Adoption Path

Services adopt `cdp-audit` when they write their first migration that introduces audit tables. Existing services that hand-rolled audit tables (e.g., `014-authentication-service`) should migrate to the `cdp-audit`-generated SQL in a follow-on migration once the tool is stable, verified by comparing the generated schema against the hand-rolled schema.

---

## Platform Audit Pattern

This section is the canonical reference for the audit pattern all CDP services must follow. Individual service data-model documents reference this section rather than re-stating it.

### Columns added to every main table

Every mutable main table MUST have these two columns. They are NOT generated by `cdp-audit` (they are part of the service's own schema); they are required inputs to the package helpers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `changed_at` | timestamp with timezone | NOT NULL, default: current time | Timestamp of the last change to this row; always overwritten by the UPDATE trigger to `now()` |
| `change_type` | small integer | NOT NULL, default 1, constrained to (1,2,3) | `1=insert`, `2=update`, `3=delete`; see `HistoryChangeType` enum |

### Behavior

| Operation | Main table | Audit table |
|-----------|-----------|-------------|
| **INSERT** | Row created with `changed_at = now()`, `change_type = 1` | No audit row written — the INSERT itself is the initial state |
| **UPDATE** | Row updated with new values; trigger sets `changed_at = now()`, `change_type = 2` | Pre-change row copied atomically before update; audit row retains the pre-change `change_type` |
| **DELETE (soft)** | `change_type` set to `3`, `changed_at = now()`; row stays on main table | Pre-change row copied atomically before the soft-delete update |
| **Hard DELETE** | PROHIBITED — trigger raises a database-level error | — |

**Application filter**: every query against a main table MUST include `WHERE change_type != 3`.  
**Composite index**: every main table MUST have a `(change_type, changed_at)` index to support time-bounded auditor queries.

### History table columns

Each `_audit` table mirrors its main table exactly, plus one additional column prepended:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `history_uuid` | UUID | PK, default uuid_generate_v7() | Surrogate PK for the audit row |
| *(all main table columns)* | | verbatim | Copied from the pre-change row, including `changed_at` and `change_type` |

The `_audit` table is append-only. No FK constraints are copied — history rows must survive independent of main-table row lifetime.

### History view

Each `_history` view unions current state with all historical states, ordered by primary key then `changed_at`. The result is a complete chronological record: the first entry for any primary key reflects the initial insert (`change_type = 1`), intermediate entries are before-images of updates, and the last entry is the current state (`change_type = 2` or `3`).

### Auth Service table pairs (reference implementation)

| Main table | Audit table | History view |
|---|---|---|
| `user_sessions` | `user_session_audit` | `user_session_history` |
| `refresh_tokens` | `refresh_token_audit` | `refresh_token_history` |
| `machine_credentials` | `machine_credential_audit` | `machine_credential_history` |

---

## Part 2: Central Audit Service *(Stub — Out of Scope for v1)*

> **Status**: Not being worked on for v1. This section records the intended architecture so it can be picked up without re-research.

### Purpose

When an auditor UI is prioritized, a single queryable store for cross-service audit events will be needed. Querying each service's database independently is not viable at scale: it requires N database connections, produces inconsistent schemas, and cannot support cross-service joins (e.g., "show all changes to patient P across all services in the last 30 days").

### Intended Architecture

- **Source**: Each service database emits change events via database change data capture (CDC) or a `NOTIFY`/outbox pattern.
- **Consumer**: The Central Audit Service subscribes to the change stream, normalizes events into a canonical envelope, and writes them to its own append-only store (a purpose-built event store or append-optimized database).
- **Read interface**: Exposes a query API used by the auditor UI. No service calls this API in the request path.
- **Authority boundary**: The Central Audit Service is a **consumer only**. It has no authority over any service's schema, no write-back capability, and no ability to modify or delete audit records. Each service's `_audit` tables remain the authoritative record.
- **Relationship to `011-operational-metrics`**: Both services are read-side projections of service state. They should share infrastructure where possible (CDC consumer management, consumer framework) and may be specced together.

### Deferred Decisions

- Replication mechanism: CDC vs. `NOTIFY`-based outbox
- Storage backend for the aggregated store
- Retention and archival policy
- Query API design (REST vs. GraphQL vs. internal only)
- Whether auditor UI lives in `008-clinician-app` or a separate internal tool

### Trigger for Activation

Spec this service when:
1. An auditor UI feature is prioritized, OR
2. A compliance requirement mandates cross-service audit queries within a defined SLA

---

## Dependencies

| Dependency | Type | Notes |
|------------|---------|-------|
| `014-authentication-service` | Reference implementation | First service to adopt the audit pattern; `cdp-audit` must reproduce its hand-rolled schema exactly |
| ADR-0004 | Architectural constraint | Full-row snapshots; sparse deltas are prohibited |
| Relational database with trigger support | Runtime | Database-enforced triggers and schema migrations |
| Migration framework | Migration | Migration runner's operation object is the only runtime dependency of `cdp-audit` |
| Real database instance (test infrastructure) | Testing | Live database required for trigger and constraint tests |

---

## Out of Scope for v1

- Central Audit Service (stubbed above)
- Auditor UI
- Retention / archival policy for audit tables
- Cross-service audit queries
- Replication slot management
