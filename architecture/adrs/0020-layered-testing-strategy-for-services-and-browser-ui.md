# 20. Layered Testing Strategy for Services and Browser UI

Date: 2026-07-02

## Status

Accepted

## Context

The platform comprises deployable HTTP services plus the CDP browser UI. Each surface has a different trust boundary and belongs in a different test layer. [AGENTS.md](https://github.com/Neosofia/workspace/blob/main/AGENTS.md) Testing Rules state the operational rules; this ADR records the layered strategy, how the layers compose, and how CI maps to each surface.

## Decision

### 1. Service unit tests

- Cover **sad paths**, boundaries, error codes, logging, and return values.
- Patch **external** dependencies only (database sessions, HTTP clients, third-party SDKs) — never patch the service layer under test to simulate integration coverage.
- Run on every CI push; enforce **≥90%** coverage with a failing build below threshold (per service `pyproject.toml` / CI unless documented otherwise).
- Configuration modules (e.g. `config.py`) MAY be excluded from coverage mapping when their structure is exercised implicitly through integration boot paths ([SDLC checklist — Testing & Delivery](https://github.com/Neosofia/corporate/blob/main/resources/checklists/sdlc.md)).

### 2. Service integration tests

- Cover **happy paths only** through the real HTTP framework (FastAPI, etc.).
- Stub or mock **external systems** at the boundary (other services' HTTP, databases where appropriate) — not internal application services.
- Assert HTTP status and that the response **conforms to the published OpenAPI spec** ([ADR-0008](0008-published-json-schema-contracts-for-api-testing.md)) — not hand-written field-by-field assertion lists.
- Where shared schemas apply, validate runtime artifacts in integration tests (e.g. log lines against `schemas/log.json` per [ADR-0009](0009-structured-json-logging-with-schema-validation.md)).
- Keep the default CI suite under **60 seconds** where practical; split slower environment-heavy checks into explicit suites.

### 3. Container tests

- Each **deployable HTTP service** MUST include at least one container test proving the release image executes, environment variables propagate, and the health endpoint responds.
- Reference pattern: [authentication `test_container.py`](https://github.com/Neosofia/authentication/blob/main/tests/integration/test_container.py).
- The CDP **static SPA** (`cdp/ui`) uses the same intent with a lighter check: `ui/scripts/test-container.sh` builds the release image, runs it with `PORT`, and asserts HTTP 200 on `/` (SPA shell) and a static asset (`/favicon.svg`) — no pytest, no backing services. Production `ui/Dockerfile` runs as non-root `app` with a `HEALTHCHECK` on `/` (SDLC supply-chain).

### 4. Browser UI — Playwright happy-path E2E only

The CDP web application (`cdp/ui`) MUST use **Playwright end-to-end tests for happy paths only**.

The CDP UI MUST **NOT** add unit tests (Vitest, Jest, etc.) or integration tests (React Testing Library, component/hook harnesses).

- **Sad paths** belong in **service unit tests**; **API contracts** belong in **service integration tests** against `openapi.json`.
- Playwright exercises user-visible workflows against built `dist/`, auth, and cross-origin APIs in one pass.

**E2E data assumptions:**

- Specs MAY assume a **properly seeded environment** (test tenant, credentials, demo catalog content such as **DEMO-123** for the visual walkthrough).
- Specs MUST NOT branch on mutable state left by **prior test runs**. Mutating specs create their own identities (unique display codes per run) or depend only on the documented seed baseline.
- No conditional “repair” steps (e.g. reopen an episode because a previous run closed it).

**E2E traceability to product specs:**

- Maintain mappings in `ui/e2e/helpers/specTraceability.ts` — `E2E_SPEC_TRACE` links each Playwright file to the product specs it verifies (for reviewers and CI).
- Visual-walkthrough gallery captions show **product spec ids** (and FR/OR anchors where helpful) per screenshot step (`WALKTHROUGH_STEPS` in `walkthrough.ts`) — not Playwright file names.
- When adding or changing E2E coverage for a workflow, update traceability metadata in the same change.

**UI CI and environments:**

| When | What |
|------|------|
| Pre-deploy (push to `main` touching `ui/**`) | TypeScript check (`tsc -b --noEmit`) — Railway Wait for CI ([OPERATIONS.md](../../OPERATIONS.md)) |
| Post-deploy (staging) | Playwright E2E against `staging.neosofia.tech` after Railway deploy ([ADR-0017](0017-railway-staging-auto-deploy.md), `cdp-ui-e2e-staging.yml`) |
| Local | `pnpm test:e2e*` — builds production `dist/` and serves it (same path as `ui/Dockerfile`) |

Staging E2E runs all specs under `ui/e2e/` (enroll, care-episode lifecycle, visual walkthrough) at desktop and mobile.

**E2E traceability:** Playwright specs map to product specs in `ui/e2e/helpers/specTraceability.ts`; walkthrough gallery captions show product spec ids per screenshot. See [ADR-0020](architecture/adrs/0020-layered-testing-strategy-for-services-and-browser-ui.md).

The CDP UI does **not** participate in the service **90% coverage** gate.

### 5. Contract ownership

- **`openapi.json`** per service is the authoritative HTTP contract ([ADR-0008](0008-published-json-schema-contracts-for-api-testing.md)).
- Integration tests validate **runtime behavior against that spec**.
- The UI generates TypeScript clients from committed OpenAPI output; contract drift is caught in **service** CI and release review — not by duplicating contract tests in the UI repo.

### Non-goals

- UI unit or integration test suites for React components, hooks, or pages.
- Code coverage targets on `cdp/ui/src`.
- Per-field assertion lists instead of OpenAPI validation in integration tests.
- Exhaustive sad-path matrices in Playwright.
- Conditional branching in Playwright specs to compensate for prior run state.

## Consequences

**Positive**

- One reference for the full testing pyramid across services and UI.
- Test investment aligned with trust boundaries; CI stays fast at each layer.

**Negative / trade-offs**

- UI regressions are caught by E2E (slower feedback than component tests — accepted).
- Staging E2E depends on seeded data, WorkOS test credentials, and post-deploy timing.
- Pre-deploy UI workflow is TypeScript-only; adding lint or full build is optional tightening, not a substitute for E2E.

## References

- [AGENTS.md — Testing Rules](https://github.com/Neosofia/workspace/blob/main/AGENTS.md)
- [SDLC checklist — Testing & Delivery](https://github.com/Neosofia/corporate/blob/main/resources/checklists/sdlc.md)
- [ADR-0008](0008-published-json-schema-contracts-for-api-testing.md) — OpenAPI as contract source
- [ADR-0009](0009-structured-json-logging-with-schema-validation.md) — log schema validation in integration tests
- [ADR-0017](0017-railway-staging-auto-deploy.md) — Railway staging deploy and CI
- [ADR-0019](0019-user-facing-error-correlation-and-incident-debugging.md) — UI error surfacing
- [OPERATIONS.md](../../OPERATIONS.md) — local E2E commands and staging workflows
