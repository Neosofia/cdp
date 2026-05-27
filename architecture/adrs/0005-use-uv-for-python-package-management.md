# 05. Use uv for Python and pnpm for Node Package Management

Date: 2026-04-19

## Status

Accepted

## Context

CDP is a multi-service monorepo with Python backends and TypeScript/React front-end applications. Each service, shared package, and UI needs dependency resolution, reproducible lockfiles, and consistent developer tooling.

### Python

Each Python service and shared package (e.g., `cdp-audit`) needs virtual environment management and lockfile generation. The Python ecosystem offers several tools for this:

- **pip + pip-tools** — ubiquitous but slow; requires separate tools for venv management and lockfile generation; no workspace support
- **Poetry** — popular; slow resolver; non-standard `pyproject.toml` extensions; workspace support is limited and recently added
- **Pipenv** — largely superseded; slow; no workspace support
- **uv** — written in Rust by Astral (the `ruff` team); drop-in compatible with `pip` and `pyproject.toml` (PEP 517/518/621); significantly faster resolver; native workspace support; produces `uv.lock` lockfiles; actively maintained

### Node

Each JavaScript/TypeScript application (e.g., `cdp/ui`) needs package installation, script execution, and lockfile generation. The Node ecosystem offers several tools for this:

- **npm** — default; flat `node_modules` layout allows phantom dependencies; slower installs in large projects; no first-class workspace support before npm workspaces
- **Yarn (Classic / Berry)** — widely used; Berry's Plug'n'Play model diverges from Node resolution conventions and increases migration cost
- **Bun** — fast; bundles runtime and package manager; less mature for reproducible CI lockfile workflows across the ecosystem
- **pnpm** — strict dependency resolution via a content-addressable store; fast, disk-efficient installs; native workspace support via `pnpm-workspace.yaml`; produces `pnpm-lock.yaml` lockfiles; integrates with Corepack via the `packageManager` field in `package.json`

Developer experience and CI speed are operational concerns: slow dependency resolution compounds across many services and slows feedback loops. Consistency across services reduces cognitive overhead when switching between them.

## Decision

### Python — uv

All CDP Python services and packages MUST use **uv** for:

- Virtual environment creation (`uv venv`)
- Dependency installation (`uv sync`)
- Adding/removing dependencies (`uv add`, `uv remove`)
- Running commands in the project environment (`uv run`)
- Lockfile generation and maintenance (`uv.lock`)

`pip`, `pip-tools`, `Poetry`, and `Pipenv` are prohibited in this project. Direct `pip install` invocations (outside of `uv`-managed environments) are prohibited in CI and developer documentation.

All packages and services use standard `pyproject.toml` (PEP 621) for metadata. No tool-specific extensions outside the `[tool.uv]` table are permitted.

The monorepo is structured as a **uv workspace** with a root `pyproject.toml` declaring workspace members. Shared packages (e.g., `packages/cdp-audit`) are workspace members and referenced as path dependencies by services without being published to PyPI.

### Node — pnpm

All CDP JavaScript/TypeScript applications MUST use **pnpm** for:

- Dependency installation (`pnpm install`)
- Adding/removing dependencies (`pnpm add`, `pnpm remove`)
- Running scripts and binaries (`pnpm run`, `pnpm exec`)
- Lockfile generation and maintenance (`pnpm-lock.yaml`)

`npm`, `yarn`, and `bun` are prohibited for package management in this project. Direct `npm install` or `yarn install` invocations are prohibited in CI and developer documentation.

Each application declares its pinned pnpm version via the `packageManager` field in `package.json` (e.g., `"packageManager": "pnpm@11.3.0"`). Monorepos use `pnpm-workspace.yaml` to declare workspace packages.

## Consequences

### Python — uv

- `uv.lock` is committed to version control and updated via `uv lock`. Lock updates are reviewed in PRs.
- CI installs dependencies with `uv sync --frozen` to enforce lockfile reproducibility.
- Local development setup is `uv sync` — one command, no manual venv activation required for `uv run`.
- New services scaffold with `uv init` inside the workspace.
- Shared packages are added to a service with `uv add --workspace cdp-audit` rather than a path string.
- Developers must have `uv` installed. Installation: `curl -LsSf https://astral.sh/uv/install.sh | sh` or `brew install uv`.

### Node — pnpm

- `pnpm-lock.yaml` is committed to version control and updated via `pnpm install`. Lock updates are reviewed in PRs.
- CI installs dependencies with `pnpm install --frozen-lockfile` to enforce lockfile reproducibility.
- Local development setup is `pnpm install` — one command to install all workspace dependencies.
- Developers enable pnpm via Corepack (`corepack enable`) or install globally (`npm install -g pnpm`). Container images install pnpm globally before running install/build steps.
