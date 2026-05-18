# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine

RUN npm install -g pnpm serve

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
