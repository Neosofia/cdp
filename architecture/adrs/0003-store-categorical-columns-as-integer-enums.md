# 03. Store Categorical Columns as Integer Enums


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

Every service that owns categorical columns MUST expose a `/meta/enums` endpoint (authenticated, read-only) that returns the current integer→label mapping for all registered enums. This endpoint:

- MUST return a stable, versioned JSON structure.
- MUST be additive-only: existing integer→label pairs MUST NOT be reused or removed (only new values added).
- MUST be used by all consumers (other services, admin tooling, migration scripts) to decode stored integers.

### Enum endpoint contract

```
GET /meta/enums
Authorization: Bearer <service-to-service token>

200 OK
{
  "version": 1,
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
