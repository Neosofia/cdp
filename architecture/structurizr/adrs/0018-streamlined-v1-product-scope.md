# 18. Streamlined v1 Product Scope

Date: 2026-06-17

## Status

Accepted

## Context

The original CDP spec set described a broad mesh: native patient apps, SMS, devices/push, EMR integration, de-identification pipeline, clean chat store, AI workbench, PagerDuty escalation queues, and a dedicated Patient Service. The team shipped a **focused v1 product** — post-discharge web care with synchronous risk and email alerts — and needs documentation to match reality. Removed specs remain recoverable from git history if scope returns.

## Decision

**In v1 scope:**

- Single responsive CDP web SPA with role switching (spec 019)
- Care Episode clinical orchestration hub (spec 015, ADR-0016)
- Chat message store (spec 001)
- Synchronous care-assistant inference in Chat and clinical risk evaluation in Care Episode (specs 001, 010; ADR-0002, ADR-0016)
- Email notification relay (spec 005)
- Platform identity, user registry, capabilities, Cedar SDK enforcement (specs 014, 016, 018, 020)
- Per-service SQL audit templates (spec 017)
- Railway staging auto-deploy (ADR-0017)

**Removed from v1 (specs deleted; revisit via git history when prioritised):**

- De-identification pipeline and clean chat store
- Native iOS/Android patient app and separate clinician deployable
- SMS service and Devices / push notification service
- EMR service and AI workbench
- Dedicated Patient Service (User registry + Care Episode demo data cover v1)
- PagerDuty / 60-second clinician self-assign escalation queue (email alert only)

## Consequences

- C4 container diagrams omit deleted components unless marked external/future in a separate landscape note
- Constitution clinical escalation principle is satisfied in v1 through email alert + clinician roster review, not paging infrastructure
- Re-adding a removed capability requires a new or restored spec and likely a new ADR if architecture changes
- Mobile support is **responsive web** only (baseline FR-006, OR-004), not app-store clients
