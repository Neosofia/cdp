# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine

RUN npm install -g http-server

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["http-server", "dist", "-p", "5173", "-a", "0.0.0.0"]
