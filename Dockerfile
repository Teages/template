# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm rebuild && pnpm prepare && pnpm build

# Production artifacts on the slim base: both final stages share this one
# .output layer instead of each copying it from the builder.
FROM base AS output
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/.output ./.output
USER node

# One-shot migration runner: plain node plus the bundled script and SQL,
# no pnpm or dev dependencies.
FROM output AS migrate
CMD ["node", ".output/migrate/main.mjs"]

FROM output AS runtime
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
