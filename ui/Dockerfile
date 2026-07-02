# syntax=docker/dockerfile:1.7
#
# CDP UI — single production Dockerfile with an optional development target.
#
# Production (default): multi-stage build → static dist/ served by `serve` as non-root `app`.
# Development: set build-arg UI_DEV=1 and target `development`; compose overrides entrypoint
# to `pnpm run dev` with a bind mount for HMR.
#
#   docker build -t cdp-ui ./ui
#   docker build -t cdp-ui:dev --target development --build-arg UI_DEV=1 ./ui

ARG UI_DEV=0

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

ARG UI_DEV

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json components.json ./
COPY policies/user/role-catalog.json ./policies/user/role-catalog.json
COPY scripts ./scripts

# Defaults match ui/.env.sample; override at build time if needed.
ARG VITE_AUTH_BASE_URL=http://localhost:8014
ARG VITE_AUTH_API_URL=http://localhost:8014
ARG VITE_CAPABILITIES_API_URL=http://localhost:8019
ARG VITE_USER_API_URL=http://localhost:8018
ARG VITE_CHAT_API_URL=http://localhost:8001
ARG VITE_CARE_EPISODE_API_URL=http://localhost:8015
ARG VITE_NOTIFICATION_API_URL=http://localhost:8005
ARG VITE_TEMPLATE_API_URL=http://localhost:8900

RUN if [ "$UI_DEV" != "1" ]; then pnpm run build; fi

# ── Runtime base (shared prod + dev) ─────────────────────────────────────────
FROM node:24-alpine AS runtime-common

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}/bin:${PATH}"

RUN addgroup -S app && adduser -S -G app app \
    && corepack enable && corepack prepare pnpm@11.3.0 --activate

WORKDIR /app

EXPOSE 5173

# ── Development runtime (UI_DEV=1; compose overrides entrypoint for Vite HMR) ─
FROM runtime-common AS development

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=app:app /app/scripts ./scripts

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '5173') + '/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER app

CMD ["pnpm", "run", "dev"]

# ── Production runtime (default build target) ──────────────────────────────────
FROM runtime-common AS production

RUN pnpm add -g serve && chown -R app:app /pnpm

COPY --from=builder --chown=app:app /app/dist ./dist

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '5173') + '/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER app

CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
