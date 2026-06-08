# Architecture Viewer — Operations Guide

Structurizr C4 viewer (diagrams, specs, ADRs). Shared [`Dockerfile`](Dockerfile): dev mounts the workspace for layout editing; production bakes everything read-only for Railway.

**Local dev** — http://localhost:8080/workspace/1

```bash
docker compose -f architecture/docker-compose.yml up -d --build
```

Edit diagram layouts in the viewer; changes autosave to `architecture/structurizr/workspace.json`. Commit that file before rebuilding production.

**Production image** — deploy URL + `/workspace/1`

```bash
docker build -f architecture/Dockerfile -t cdp-structurizr-server .
```
