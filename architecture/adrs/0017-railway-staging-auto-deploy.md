# 17. Railway Staging Auto-Deploy on CI Pass

Date: 2026-06-17

## Status

Accepted

## Context

Early Structurizr deployment views described Proxmox LXC dev hosts and planned AWS ECS for Authentication only. The platform now runs **staging** as a multi-service Railway project (`staging.neosofia.tech` and per-service Railway URLs). Each service repository publishes CI workflows; Railway watches GitHub checks and deploys when CI passes on `main` or on tagged releases.

Forces at play:

- Fast iteration for a multi-repo platform without manual SSH deploys
- Consistent staging parity across Authentication, User, Capabilities, Chat, Care Episode, Notification, and CDP UI
- Cross-origin browser topology (ADR-0013) requires build-time `VITE_*_API_URL` pins on the UI service

## Decision

Document and operate **Railway** as the **staging auto-deploy target** for all platform services and the CDP UI:

1. Push to `main` (or service tag per release workflow) triggers CI in GitHub
2. When required CI jobs pass, Railway deploys the linked service automatically
3. CDP UI build args supply public HTTPS API URLs for each probed service
4. Local development remains Docker Compose per CDP `OPERATIONS.md` — not a substitute for staging verification

Production deployment topology beyond staging is out of scope for this ADR and will be recorded separately when chosen.

## Consequences

- Structurizr deployment views prioritise Railway staging over Proxmox/AWS auth-only diagrams
- `INSTALLATION_PLAN.md` and `OPERATIONS.md` in each service should state Railway service names and verification URLs
- Operators verify staging after CI green + Railway deploy complete, not only after merge
- Secrets and CORS origins are managed in Railway project variables per service
