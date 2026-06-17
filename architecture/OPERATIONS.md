# Architecture Viewer — Operations Guide

Structurizr C4 viewer (diagrams, specs, ADRs). Shared [`Dockerfile`](Dockerfile): dev mounts the workspace for layout editing; production bakes everything read-only for Railway.

**Local dev** — http://localhost:8080/workspace/1

```bash
docker compose -f architecture/docker-compose.yml up -d --build
```

## Structure vs layouts

| File | Owns |
|------|------|
| `architecture/structurizr/workspace.dsl` | Model structure, relationships, views, styles |
| `architecture/structurizr/workspace.json` | Diagram positions (autosaved by Structurizr Local) |

**Local container startup** merges DSL structure into the existing `workspace.json` so diagram layouts are **not** reset when the container restarts.

After **DSL-only** edits (new containers, relationships, views), apply structure without losing layouts:

```bash
architecture/scripts/sync_structurizr_workspace.sh
docker compose -f architecture/docker-compose.yml restart structurizr
```

To intentionally discard all saved layouts (one-off reset after a large refactor):

```bash
architecture/scripts/sync_structurizr_workspace.sh --reset
```

**Manual layout edits** in the viewer autosave to `workspace.json`. **Commit `workspace.json`** when layouts should ship — production and staging bake that file into the image.

**Deployment diagram auto-layout:** Structurizr Local uses Dagre in the browser; it fails silently on relationships between deployment nodes (for example CI → Railway). `StagingDeployment` shows runtime only; `StagingCIPipeline` shows GitHub Actions → GHCR. Tag cross-node deploy edges `CIDeploy` and exclude them from the runtime view. After changing deployment view `include`/`exclude` filters, refresh the view relationship list (full export or replace `deploymentViews` from export) — a plain merge can keep stale relationships and autolayout will still fail.

**Production image** — deploy URL + `/workspace/1`

```bash
docker build -f architecture/Dockerfile -t cdp-structurizr-server .
```

**Firefox diagram preview (production only):** Structurizr’s SVG export omits canvas dimensions unless `options.dimensions = true`, which makes Firefox render the navigator/thumbnail at the wrong scale. The production nginx layer injects that flag via `sub_filter` in [`Dockerfile`](Dockerfile) (dev compose talks to Structurizr directly on `:8080` with no nginx, so local Firefox may still show the tiny thumbnail — expected).

Rebuild and redeploy the Structurizr image after committing both DSL and JSON changes so teammates see the same diagram positions.
