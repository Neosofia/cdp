# Clinical Data Platform (CDP)

A HIPAA-aligned reference architecture for AI-assisted care coordination: patients converse with a care assistant over SMS, web, and mobile; escalation signals route high-risk situations to on-call clinicians. CDP composes Neosofia platform services—authentication, authorization, chat, notification, and others—under shared specs, ADRs, and a constitution. It is a starting point for organizations building their own clinical data platform, not a drop-in substitute for a fully operational, regulatory-compliant production system without your own compliance and operations work.

## Resources

### Operations

For developers, testers, and system administrators, [OPERATIONS.md](OPERATIONS.md) covers local stack setup, environment files, and smoke checks. For interactive C4 diagrams (Structurizr), see [architecture/OPERATIONS.md](architecture/OPERATIONS.md). Cloud deploy runbooks live in the [infrastructure](https://github.com/Neosofia/infrastructure) repo. Per-release operator steps and verification are in [INSTALLATION_PLAN.md](INSTALLATION_PLAN.md).

### Security

For security reviewers and on-call engineers, [SECURITY.md](SECURITY.md) documents platform-wide PHI containment, identity, audit, and supply-chain controls. Each deployable service maintains its own `SECURITY.md` for service-specific threat models.

### Specifications

For product owners, architects, and implementers, [specs/](specs/) defines what each CDP component must do. Cross-cutting requirements (TLS, logging, OpenAPI contracts, accessibility) live in [000-platform-baseline.md](specs/000-platform-baseline.md); feature specs inherit it.

### Governance and architecture

For architects and senior engineers, [architecture/constitution.md](architecture/constitution.md) captures non-negotiable platform principles. [architecture/adrs/](architecture/adrs/) records durable architectural decisions. [architecture/structurizr/](architecture/structurizr/) holds the C4 model; static diagram exports are in [architecture/structurizr/images/](architecture/structurizr/images/).

### Releases

For operators and release managers, [CHANGELOG.md](CHANGELOG.md) records user-visible outcomes per [Keep a Changelog](https://keepachangelog.com/). [INSTALLATION_PLAN.md](INSTALLATION_PLAN.md) is the Product Installation Plan (deploy, configure, verify, evidence).

**Versioning:** CDP UI displays **CalVer** `YYYY.MM.DD` in the footer (`ui/src/lib/uiVersion.ts`). Backend services expose **semver** on `GET /health` as `"version"`.

### CDP UI and policies

For frontend contributors, [ui/README.md](ui/README.md) covers the reference clinician and patient web apps. CDP policy artifacts (Cedar, role catalog) live in [policies/README.md](policies/README.md).

### Platform portfolio

CDP builds on separately versioned Neosofia repos: [authentication](https://github.com/Neosofia/authentication), [capabilities](https://github.com/Neosofia/capabilities), [chat](https://github.com/Neosofia/chat), [sdk](https://github.com/Neosofia/sdk), [schemas](https://github.com/Neosofia/schemas), [templates](https://github.com/Neosofia/templates), [infrastructure](https://github.com/Neosofia/infrastructure), and [platform-workflows](https://github.com/Neosofia/platform-workflows).

## Primary workflows

The two end-to-end workflows are **patient chat** (inbound message → Chat Service → AI care assistant → channel reply) and **clinician escalation** (risk signal → notification → on-call assignment → clinician takeover). Workflow diagrams are in [architecture/structurizr/images/](architecture/structurizr/images/); owning specs include [001-chat-service](specs/001-chat-service.md), [005-notification-service](specs/005-notification-service.md), and [010-ai-agent-service](specs/010-ai-agent-service.md).
