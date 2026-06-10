# 03. Store Categorical Columns as Integer Enums

Date: 2026-04-19

## Status

Accepted

## Context

PostgreSQL `TEXT` columns with `CHECK IN (...)` constraints are commonly used for categorical data. They are human-readable at the database layer but have several drawbacks:

- Storage is larger than necessary (TEXT vs SMALLINT).
- Renaming or extending a value requires a DDL migration touching existing rows.
- Cross-service consumers must hardcode string literals, creating a distributed constant-coupling problem.
- There is no enforced, discoverable contract for valid values.

## Decision

All categorical columns in service-owned databases MUST be stored as `SMALLINT NOT NULL`.

Each such column MUST have a corresponding enum definition (Python `IntEnum` or equivalent) in the service codebase. The mapping is the single source of truth.

Every service that owns categorical columns MUST expose a `/meta/enums` endpoint (read-only, rate-limited) that returns the current integer→label mapping for all registered enums. Authentication is not required — the mapping is non-sensitive metadata. This endpoint:

- MUST return a stable JSON structure keyed by enum name.
- MUST be additive-only: existing integer→label pairs MUST NOT be reused or removed (only new values added).
- MUST be used by all consumers (other services, admin tooling, migration scripts) to decode stored integers.

No registry or per-enum version field is required. Integer assignments are immutable once published; consumers always decode stored values against the current mapping. Because integers are never renumbered or reused, historical registry snapshots are unnecessary.

### Labels are stable machine keys, not display copy

Each label string (for example `web`, `mobile_app`) is a **stable identifier** for humans and tooling — not final user-facing copy. Labels MUST remain stable across releases; renaming a label is a breaking change for anything that cached or logged it. Do not use labels as persistence keys in client logic; use the integer.

User-facing display text will eventually route through i18n; translation catalogs SHOULD key off these stable labels (or the integer rendered as a string), not ad hoc UI strings. The `/meta/enums` endpoint supplies the canonical English/default label until a product surface wires locale-specific copy.

### Enum endpoint contract

```
GET /meta/enums

200 OK
{
  "enums": {
    "<EnumName>": {
      "<integer>": "<label>",
      ...
    }
  }
}
```

### Database convention

| Instead of | Use |
|---|---|
| `TEXT CHECK IN ('a','b','c')` | `SMALLINT NOT NULL` with `CHECK (col IN (1,2,3))` |
| `VARCHAR(50)` for a fixed set | `SMALLINT NOT NULL` |

Integer values MUST start at 1 for normal values. The value `0` is reserved to mean `unknown`/`unset` where an unknown state is valid in the domain model (e.g., `user_type = 0` for unauthenticated actors in audit logs). Values are additive-only; integers MUST NOT be renumbered or reused.

### Migration practice

When introducing a new enum value, add a new integer and label to the enum definition and `GET /meta/enums`. Migration scripts MUST NOT perform back-fills that change existing integer values.

## Consequences

- All service teams MUST update existing TEXT categoricals to SMALLINT in their next major migration.
- Service clients MUST NOT hardcode category labels in logic that persists data; they MUST use the integer constants from a shared enum or the decode endpoint.
- Readability at the raw-SQL level is reduced; this is accepted in exchange for the benefits above.

## Alternatives Considered

- **PostgreSQL native `ENUM` type**: Rejected — DDL ALTER TABLE is required to add values, which is non-trivial in a zero-downtime migration strategy.
- **TEXT with CHECK**: Rejected — see Context above.
- **Lookup table per enum**: Considered but rejected for simplicity; the `/meta/enums` endpoint fulfils the discoverability need without extra joins on hot-path queries.
