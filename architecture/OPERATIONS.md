# Architecture Viewer — Operations Guide

Structurizr workspace for C4 diagrams, embedded documentation, and ADRs. Two workflows share one [`Dockerfile`](Dockerfile) and one doc-prep script ([`scripts/prepare_structurizr_content.py`](scripts/prepare_structurizr_content.py)); only runtime mode differs.

Canonical markdown (`README.md`, `specs/`, `architecture/constitution.md`) is never modified for Structurizr. The prep script writes viewer-only copies under `structurizr/content/` (ignored via [`structurizr/content/.gitignore`](structurizr/content/.gitignore); excluded from the Docker build context via the repo root [`.dockerignore`](../.dockerignore)).

## Quick reference

| | Dev | Production |
|---|---|---|
| **Purpose** | Edit diagram layouts; autosave to `workspace.json` | Read-only public viewer (Railway) |
| **Dockerfile target** | `dev` | `production` (default) |
| **Start** | `docker compose up -d --build` (from this directory) | `docker build -f architecture/Dockerfile -t cdp-structurizr-server .` (from repo root) |
| **Diagram editing** | Yes | No (`-Dstructurizr.editable=false`) |
| **Documentation** | Regenerated on every container start | Baked in at image build |
| **Volume mounts** | Yes — `architecture/structurizr/` mounted so layout edits autosave to `workspace.json` on the host | No — workspace baked in the image |
| **Viewer URL** | http://localhost:8080/workspace/1 | Your deploy URL + `/workspace/1` |

Alternative dev command from the **repo root**:

```bash
docker compose -f architecture/docker-compose.yml up -d --build
```

Stop the dev viewer:

```bash
cd architecture/
docker compose down
```

---

## Workflow 1 — Dev (editable local mode)

Use this to adjust diagram layouts and commit `architecture/structurizr/workspace.json` for production.

```bash
cd architecture/
docker compose up -d --build
```

Open http://localhost:8080/workspace/1 (use `localhost`, not `127.0.0.1`). Click the pencil icon on a diagram to edit layout; changes autosave to `architecture/structurizr/workspace.json` every few seconds.

**On each container start**

1. [`docker/dev-entrypoint.sh`](docker/dev-entrypoint.sh) runs `prepare_structurizr_content.py` against the repo mounted at `/repo`.
2. Structurizr starts in **local mode** on port 8080.
3. [`structurizr/structurizr.properties`](structurizr/structurizr.properties) enables editing and raises the workspace size limit to 10MB (the committed workspace exceeds Structurizr’s 1MB default once docs and images are embedded).

**Compose mounts**

| Host path | Container path | Purpose |
|---|---|---|
| Repo root (`..`) | `/repo` (read-only) | Canonical sources for doc prep |
| `architecture/scripts/prepare_structurizr_content.py` | `/usr/local/bin/prepare_structurizr_content.py` (read-only) | Live prep script without image rebuild |
| `architecture/structurizr/` | `/usr/local/structurizr` | DSL, views, `workspace.json`, generated `content/` |
| `architecture/adrs/` | `/usr/local/structurizr/adrs` | ADRs (`!adrs adrs` in DSL) |

**When to restart vs rebuild**

| Change | Action |
|---|---|
| Canonical docs (`README.md`, `specs/`, `constitution.md`) | `docker compose restart structurizr` (prep runs again on start) |
| `workspace.dsl`, views, ADRs, or diagram layout | Refresh browser; layout saves automatically. Restart only if the server was stopped. |
| `Dockerfile`, entrypoint, or prep script | `docker compose up -d --build` |

**Ship layout to production:** commit `architecture/structurizr/workspace.json` (and any DSL/view changes) and rebuild the production image.

---

## Workflow 2 — Production (read-only local mode)

Self-contained image for Railway. Structurizr runs in local mode on an internal port; nginx listens on `:8080`, sets `Host: localhost:8081`, and applies response filters so the viewer works behind a public URL.

```bash
# From repo root
docker build -f architecture/Dockerfile -t cdp-structurizr-server .

# Optional local smoke test
docker run -d --name structurizr -p 8080:8080 cdp-structurizr-server
```

Redeploy whenever any of these change: `workspace.dsl`, view DSL files, committed `workspace.json`, ADRs, canonical markdown/specs, or diagram images.

**At image build time**

1. `architecture/structurizr/` is copied (DSL, views, `workspace.json`, `structurizr.properties`).
2. `architecture/adrs/` is copied to `/usr/local/structurizr/adrs`.
3. `prepare_structurizr_content.py` bakes transformed docs into `/usr/local/structurizr/content/`.
4. nginx + read-only Structurizr (`-Dstructurizr.editable=false`) are configured in the image entrypoint.

Production overrides `structurizr.editable` via JVM flags in the image; diagrams cannot be edited in the deployed viewer.

---

## Documentation pipeline

`workspace.dsl` imports generated content via:

```dsl
!docs content/README.md
!docs content/constitution.md
!docs content/specs
!docs images
!adrs adrs
```

The prep script demotes every Markdown heading by one level (Structurizr hides `#`), rewrites relative links so they resolve under `/workspace/1/documentation/` (and maps ADR/spec catalogs to the decisions log and spec index), and rewrites README image paths so embedded PNGs resolve against `structurizr/images/` (imported directly via `!docs images`, not copied into `content/`). GitHub and other consumers continue to use the canonical files unchanged. To add or relocate docs, extend `DEFAULT_SOURCES` in [`scripts/prepare_structurizr_content.py`](scripts/prepare_structurizr_content.py).

## Content map

| Content | Canonical location | In the viewer |
|---|---|---|
| Overview | `README.md` | `structurizr/content/README.md` (generated) |
| Constitution | `architecture/constitution.md` | `structurizr/content/constitution.md` (generated) |
| Feature specs | `specs/*.md` | `structurizr/content/specs/*.md` (generated) |
| Diagram images | `architecture/structurizr/images/` | `structurizr/images/` (canonical; imported directly) |
| C4 model | `architecture/structurizr/workspace.dsl`, `*-views.dsl`, `deployments.dsl` | Dev: mounted · Prod: baked |
| Diagram layouts | `architecture/structurizr/workspace.json` | Dev: mounted (editable) · Prod: baked (read-only) |
| ADRs | `architecture/adrs/*.md` | Dev: mounted · Prod: baked |
| Local settings | `architecture/structurizr/structurizr.properties` | Dev: mounted · Prod: baked (editable overridden in prod) |
| Doc prep | `architecture/scripts/prepare_structurizr_content.py` | Dev: every start · Prod: every build |

---

## ADR date conventions

ADR markdown files must include a `Date:` field on line 3 (after the title and a blank line) in `YYYY-MM-DD` format. Files without a `Date:` field default to the current date, which causes them to sort incorrectly in the decision log.

```markdown
# 12. My New Decision

Date: 2026-05-20

## Status

Accepted
```
