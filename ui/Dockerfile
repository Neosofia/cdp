# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Defaults match ui/.env.sample; override at build time if needed.
ARG VITE_AUTH_BASE_URL=http://localhost:8014
ARG VITE_AUTH_API_URL=http://localhost:8014
ARG VITE_CAPABILITIES_API_URL=http://localhost:8019
ARG VITE_USER_API_URL=http://localhost:8018
ARG VITE_CHAT_API_URL=http://localhost:8001
ARG VITE_CARE_EPISODE_API_URL=http://localhost:8015
ARG VITE_TEMPLATE_API_URL=http://localhost:8900

RUN pnpm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine

RUN npm install -g pnpm serve

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
