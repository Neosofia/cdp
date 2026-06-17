# 16. Care Episode as Clinical Orchestration Hub

Date: 2026-06-17

## Status

Accepted

## Context

Original specs placed care-assistant inference and synchronous risk evaluation in the Chat Service, with Care Episode responsible for episode lookup only. The shipped v1 product instead routes **all patient chat orchestration** through Care Episode:

- Recovery (care window) validation
- Interaction create with authoritative context
- Completion proxy to Chat + Groq
- Synchronous risk evaluation and rolling summaries
- High-risk escalation email via Notification

The CDP web application calls Care Episode; Care Episode calls Chat with service tokens. This reduces browser coupling, centralises clinical workflow policy, and matches operator mental models ("clinical hub").

## Decision

Treat **Care Episode Service** as the **clinical orchestration hub** for the patient chat path in v1. Chat remains the authoritative PHI message store. Care Episode owns orchestration, risk evaluation, recovery lifecycle, and escalation handoff.

Specs 001, 010, 015, and 019 reflect this split. The CDP UI must not call Chat directly for patient create/completion flows.

## Consequences

- Chat Service API surface focuses on storage, history, interaction metadata, and inference configuration — not escalation or risk records
- Care Episode gains the largest clinical API contract; contract tests and OpenAPI diffs there are release gates
- Future channel adapters (SMS, native apps) would re-enter through Care Episode orchestration, not direct Chat browser paths
- Structurizr dynamic views show Patient → CDP UI → Care Episode → Chat / Groq / Notification
