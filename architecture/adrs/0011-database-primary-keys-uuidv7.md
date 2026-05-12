# ADR 0011: Database Primary Keys and UUIDv7

## Status

Accepted

## Context

When designing database schemas, naming conventions for primary and foreign keys establish the foundation for developer expectations and system integrations. 

Historically, relational databases default to auto-incrementing integers (e.g., `id` or `table_id`). Relying on integers or sequence numbers presents multiple issues:
1. **Unpredictability in distributed systems:** Standard sequences require centralized coordination or locking, leading to bottlenecks.
2. **Security/Enumeration risk:** Sequential integers allow predictable enumeration attacks, exposing volume and growth rates.
3. **Ambiguity in schema design:** Naming a column `id` masks its underlying type, while naming it `<table_name>_id` creates redundancy.
4. **Locality issues with v4 UUIDs:** While UUIDv4 solves the distributed and enumeration issues, it produces completely random hashes. Inserting random UUIDs into a B-Tree index causes severe fragmentation and performance degradation at scale due to lack of temporal locality.

We need a standardized convention that accurately conveys the data type, ensures temporal sorting for index performance, and maintains clarity across the data model.

## Decision

1. **Standardize on UUIDv7:** We will use UUIDv7 (`uuidv7()`) for all primary identifiers. UUIDv7 combines a Unix timestamp (millisecond precision) with random data. This strictly preserves time-ordering, resulting in ordered B-Tree inserts that solve the database fragmentation and performance issues typically associated with UUIDv4, while retaining global uniqueness and security against enumeration.
2. **Primary Key Nomenclature:** The primary key column in every table must be explicitly named `uuid`. This completely breaks the assumption of an auto-incrementing integer and strictly signals the data type to developers. Redundant table-prefix naming (e.g., `user_uuid` in the `users` table) is prohibited.
3. **Foreign Key Nomenclature:** Foreign keys referencing a primary identifier must be named using the format `<singular_target_table>_uuid` (e.g., `machine_credential_uuid`).

## Consequences

* **Improved Performance:** Time-ordered UUIDs guarantee index locality during `INSERT` heavy workloads.
* **Developer Clarity:** Naming the primary key `uuid` acts as self-documenting code, enforcing type awareness immediately.
* **Standardization:** Both code and documentation must align across the architecture. Migrations and ORM configurations must explicitly declare `uuid` as the primary key.
* **Integration Overhead:** Any external system integrations must expect UUID generation based on the v7 standard instead of monotonically increasing sequences.
