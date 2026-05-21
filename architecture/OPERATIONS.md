# Architecture Viewer — Operations Guide

Containerised Structurizr server for viewing the CDP architecture C4 diagrams and ADRs.

## Quick Start (Local Development)

The `docker-compose.yml` file is provided for **local development and testing only**. It uses the official Structurizr image and mounts your local files, allowing for near-instant feedback when editing diagrams or ADRs.

```bash
cd architecture/
# Start the local instance (mounts local DSL/ADRs)
docker compose up -d
```

The viewer is available at [http://localhost:8080/workspace/1](http://localhost:8080/workspace/1).

## Production Deployment

The `Dockerfile` builds a self-contained, read-only viewer using the official `structurizr/structurizr` image. It bakes the workspace and ADRs into the image and runs Structurizr in **local mode** (single workspace, no workspace creation) behind an nginx reverse proxy.

**How the read-only trick works:** nginx sits in front of Structurizr on an internal port and rewrites the `Host` header to `localhost`. Structurizr detects `localhost` and activates local mode. The `structurizr.editable=false` JVM property disables diagram editing. All API calls from the browser use relative URLs, so the setup works transparently behind any public URL (Railway, Fly.io, a VPS, etc.) without extra configuration.

**Build and run:**
```bash
# Build from the repo root
docker build -f architecture/Dockerfile -t cdp-structurizr-server .

# Run — no env vars required
docker run -d --name structurizr -p 8080:8080 cdp-structurizr-server
```

The viewer is available at [http://localhost:8080/workspace/1](http://localhost:8080/workspace/1).

## Updating content

Rebuild whenever `.dsl` or `.md` files change — the workspace is baked in at build time.

```bash
docker build -f architecture/Dockerfile -t cdp-structurizr-server .
```

| Content | Location |
|---|---|
| C4 model / views | `structurizr/workspace.dsl`, `structurizr/workspace-views.dsl` |
| ADRs | `adrs/*.md` |
| Deployment views | `structurizr/deployments.dsl`, `structurizr/deployment-views.dsl` |

## ADR date conventions

ADR markdown files must include a `Date:` field on line 3 (after the title and a blank line) in `YYYY-MM-DD` format. Files without a `Date:` field default to the current date, which causes them to sort incorrectly in the decision log.

```markdown
# 12. My New Decision

Date: 2026-05-20

## Status

Accepted
```
