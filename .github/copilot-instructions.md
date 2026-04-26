# Rules of Engagement

## AI Rules
- Never update this document; unless a human asks you to
- **Always start services using the top-level compose file** — `docker compose -f docker-compose.dev.yml up -d`; never run `docker compose up` from inside a service directory, as per-service compose files lack shared infrastructure (Traefik, LocalStack secret seeding) and will fail
- Never commit to the repo; unless a human asks you to
- Never reference /memories/, tool names, or internal agent state in any file committed to the repo
- **Never change `.env` files** — do not write, copy, create, or modify any `.env`, unless a human explicitly asks you to
- When using spec kit
  - don't put contracts in the spec folder; each service owns its API contract at `services/<service>/openapi.json` (per [ADR-0008](../architecture/structurizr/decisions/0008-published-json-schema-contracts-for-api-testing.md)); cross-service/shared schemas (e.g. `log.json`) live in `schemas/` (see [schemas/README.md](../schemas/README.md)); specs link to contracts, not the other way around
  - Keep technical details out of specs as much as possible; focus on user needs and behavior
  - after implementation is complete, run a **distillation pass**: walk every transient spec-kit artifact (research.md, plan.md, tasks.md, checklists/, contracts/ drafts, data-model.md, quickstart.md, etc.) and for each one decide:
    - **memorialize** — promote durable decisions to their canonical home (ADR for technical decisions, Constitution for principles, SECURITY.md / README.md for operational facts, code comments or migrations for data model, openapi.json for contracts)
    - **let go** — delete the file; spec-kit scaffolding is not a deliverable
    - the spec.md itself stays as the human-readable feature record, but must link forward to the memorialized artifacts, not backward to deleted scaffolding
  - a feature is not "done" until the distillation pass leaves the repo DRY... Trigger the pass with "distill NNN" (e.g. "distill 014").

## Code Style (Humans and AI)

- Python: follow PEP 8; all imports at the top grouped by standard library, third-party, and local.
- Environment variables only for secrets and service configuration with "safe" defaults
- No PHI/PII/SPII in logs, metrics, or error messages 

## Design, Implementation & Documentation

- **DRY** — one authoritative source for every fact; no copy-paste logic or duplicated config
- **No tight coupling** — this applies to procedures in documentation, services, and code etc.
- **Commit lockfiles** — `uv.lock` and equivalent lockfiles MUST be committed; they pin dependency hashes and are the first line of defence against supply chain attacks
- **6Cs** Complete, Correct, Concise, Courtesy, Clear, Considerate
- **YAGNI**
- **Explicit over implicit** — name things precisely; avoid magic numbers, strings, or behavior
- **APFE&EIIP** A place for everything and everything in its place
  - Per-service API contract -> `services/<service>/openapi.json` (ADR-0008)
  - Shared/cross-service schemas -> `schemas/` (e.g. `schemas/log.json`)
  - Data model -> Alembic migration in services
  - Research -> ADRs in architecture/structurizr/decisions
  - Implementation -> code in services
  - Principles - Constitution in .specify/memory/constitution.md
  - Architecture - C4 diagrams in architecture/structurizr
  - Governance -> ADRs, Architecture, Constitution
  
## Project Governance Pointers

- [Constitution](../.specify/memory/constitution.md) — core principles and non-negotiables
- [Architecture](../architecture/structurizr/) — C4 model and component diagrams
- [Architecture Decision Records (ADRs)](../architecture/structurizr/decisions/) — binding technical decisions
- [Feature specifications](../specs/) — one subdirectory per feature (e.g. `specs/014-authentication-service/`)

