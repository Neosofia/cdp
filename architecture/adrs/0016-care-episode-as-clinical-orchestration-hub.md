# 16. Care Episode as Clinical Orchestration Hub

Date: 2026-06-17

## Status

Accepted

## Context

Original specs colocated care-assistant inference and synchronous risk evaluation in the Chat Service, with Care Episode responsible for episode lookup only. The v1 product **splits inference by concern**:

- **Care-assistant inference** stays in **Chat** (message store owns the assistant turn).
- **Clinical risk evaluation** runs in **Care Episode** after Chat persists the patient content turn.
- Care Episode **orchestrates** patient chat writes: recovery validation, interaction create with authoritative context, completions proxy to Chat, synchronous risk evaluation, rolling summaries, and high-risk escalation email via Notification.

Care Episode calls Chat with service tokens for orchestrated writes. Reads of thread list and message history may go directly from the CDP web application to Chat when the patient JWT authorises access — Chat owns that data and there is no product requirement to proxy reads through Care Episode.

## Decision

Treat **Care Episode Service** as the **clinical orchestration hub** for patient chat **writes** in v1: interaction create, completions proxy, synchronous **risk** evaluation, and escalation handoff. **Chat Service** remains the authoritative PHI message store and runs **care-assistant inference** when an orchestrator requests completions. Care Episode owns recovery lifecycle, server-side context injection, and risk evaluation on each turn — not assistant model calls.

**Proxy only when a feature requires it.** Patient channel clients route **interaction create** and **completions** through Care Episode so recovery validation, authoritative context, risk agent execution, and escalation policy run in one place. Completions proxy forwards to Chat, which persists messages and invokes the assistant model. **Thread list and message history reads** go to Chat directly — fewer failure points, no CE involvement needed to pull stored messages.

Specs 001, 010, 015, and 019 state behaviour; this ADR owns topology. The CDP UI must not call Chat directly for patient interaction create or completion flows.

## Consequences

- Chat Service API surface focuses on storage, history, interaction metadata, **care-assistant inference**, and inference configuration — not escalation or risk records
- Care Episode calls the external inference provider for **risk evaluation only**; Chat calls it for **care-assistant completions**
- Care Episode gains the largest clinical write-path contract; contract tests and OpenAPI diffs there are release gates ([ADR-0020](0020-layered-testing-strategy-for-services-and-browser-ui.md))
- CDP UI holds two patient chat integration surfaces by design: Care Episode for writes, Chat for authorised reads
- Future channel adapters (SMS, native apps) would re-enter through Care Episode for writes; reads follow the same “direct to data owner when no orchestration feature is required” rule
- Structurizr dynamic views show Patient → CDP UI → Care Episode → Chat → inference (assistant) and Care Episode → inference (risk) / Notification for write paths, and Patient → CDP UI → Chat for read paths
