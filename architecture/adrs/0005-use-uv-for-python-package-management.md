# 5. Use uv for Python Package Management

Date: 2026-04-19

## Status

Accepted

## Context

CDP is a multi-service Python monorepo. Each service and shared package (e.g., `cdp-audit`) needs dependency resolution, virtual environment management, and reproducible lockfiles. The Python ecosystem offers several tools for this:

- **pip + pip-tools** — ubiquitous but slow; requires separate tools for venv management and lockfile generation; no workspace support
- **Poetry** — popular; slow resolver; non-standard `pyproject.toml` extensions; workspace support is limited and recently added
- **Pipenv** — largely superseded; slow; no workspace support
- **uv** — written in Rust by Astral (the `ruff` team); drop-in compatible with `pip` and `pyproject.toml` (PEP 517/518/621); significantly faster resolver; native workspace support; produces `uv.lock` lockfiles; actively maintained

Developer experience and CI speed are operational concerns: slow dependency resolution compounds across many services and slows feedback loops. Consistency across services reduces cognitive overhead when switching between them.

## Decision

All CDP Python services and packages MUST use **uv** for:

- Virtual environment creation (`uv venv`)
- Dependency installation (`uv sync`)
- Adding/removing dependencies (`uv add`, `uv remove`)
- Running commands in the project environment (`uv run`)
- Lockfile generation and maintenance (`uv.lock`)

`pip`, `pip-tools`, `Poetry`, and `Pipenv` are prohibited in this project. Direct `pip install` invocations (outside of `uv`-managed environments) are prohibited in CI and developer documentation.

All packages and services use standard `pyproject.toml` (PEP 621) for metadata. No tool-specific extensions outside the `[tool.uv]` table are permitted.

The monorepo is structured as a **uv workspace** with a root `pyproject.toml` declaring workspace members. Shared packages (e.g., `packages/cdp-audit`) are workspace members and referenced as path dependencies by services without being published to PyPI.

## Consequences

- `uv.lock` is committed to version control and updated via `uv lock`. Lock updates are reviewed in PRs.
- CI installs dependencies with `uv sync --frozen` to enforce lockfile reproducibility.
- Local development setup is `uv sync` — one command, no manual venv activation required for `uv run`.
- New services scaffold with `uv init` inside the workspace.
- Shared packages are added to a service with `uv add --workspace cdp-audit` rather than a path string.
- Developers must have `uv` installed. Installation: `curl -LsSf https://astral.sh/uv/install.sh | sh` or `brew install uv`.
