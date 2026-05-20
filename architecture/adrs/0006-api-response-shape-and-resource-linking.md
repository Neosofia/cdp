# 06. API Response Shape and Resource Linking

Date: 2026-04-19

## Status

Proposed — deferred for decision when patient-facing and clinician-facing APIs are designed

## Context

CDP services expose HTTP APIs consumed by the Patient Chat App (Flutter), the Clinician App (React), and internal service-to-service calls. As services are designed, a consistent decision is needed on two related questions:

1. **Object embedding vs. URI linking** — when a resource references another resource, should the response embed the related object inline, or return an identifier/URI the consumer can follow?
2. **List response format** — for endpoints returning collections, should the response be JSON, CSV, or negotiated per use case?

These decisions affect every list and relational endpoint across the platform. Deferring them service-by-service will produce inconsistent APIs.

### Object Embedding vs. URI Linking

**Full embedding** — the response includes the full related object inline:
```json
{ "session_uuid": "550e...", "user": { "id": "usr_01", "name": "Jane", "roles": ["clinician"] } }
```

**ID-only** — the response returns just the foreign key; the consumer makes a second request to fetch the related resource:
```json
{ "session_uuid": "550e...", "user_id": "usr_01" }
```

**HATEOAS** — the response returns a URI the consumer follows:
```json
{ "session_uuid": "550e...", "user": { "href": "/users/usr_01" } }
```

**Selective expansion** — the response defaults to ID-only but accepts an `?expand=user` query parameter to opt into embedding:
```json
GET /sessions/550e...?expand=user
```

| Approach | Pros | Cons |
|----------|------|------|
| Full embedding | Single round trip; easy client code | Over-fetching; coupling between services; stale data if related resource changes |
| ID-only | Minimal coupling; each resource fetched fresh | Multiple round trips; client must orchestrate; painful on high-latency mobile |
| HATEOAS | Theoretically decoupled; API is self-describing | Rarely implemented fully in practice; clients still hardcode URIs; multiplies round trips |
| Selective expansion | Flexible; clients opt into embedding when needed | More complex to implement; `?expand=` semantics must be consistent platform-wide |

### List Response Format

**JSON** — structured, supports nested objects, pagination metadata, and error envelopes natively:
```json
{ "items": [...], "next_cursor": "abc", "total": 142 }
```

**CSV** — compact, human-readable, familiar to data/analytics consumers; no nesting support:
```
session_uuid,user_type,issued_at
550e...,clinician,2026-04-19T10:00:00Z
```

| Approach | Pros | Cons |
|----------|------|------|
| JSON always | Consistent; supports nested objects, pagination, error envelopes; universal client support | Verbose for flat bulk data; higher CPU for large result sets |
| CSV always | Compact for flat tabular data; ETL-friendly | No nesting; no standard error envelope; pagination is non-standard |
| JSON default + CSV export variant | Best of both; API consumers get JSON; data/analytics consumers get CSV via `?format=csv` or a dedicated `/export` endpoint | Two code paths to maintain |

## Decision

*To be decided when the first patient-facing or clinician-facing list/relational API is designed.*

Candidate recommendation for that decision point:

- **Resource linking**: adopt **selective expansion** (`?expand=`) as the default pattern — ID-only by default, opt-in embedding for known high-value combinations. Avoid full HATEOAS; it has poor real-world adoption and multiplies mobile round trips.
- **List format**: **JSON default with a dedicated `/export` endpoint returning CSV** for bulk data use cases (audit exports, operational metrics downloads). Do not mix formats on the same endpoint.

## Consequences

- This ADR must be resolved before any patient-facing or clinician-facing list endpoint is designed.
- Resolution should produce a platform-wide API style guide covering pagination envelope shape, `?expand=` semantics, and export endpoint conventions.
- Services designed before this ADR is resolved (auth, authorization) are narrow single-resource endpoints with no relational depth — they are not affected by this decision.
