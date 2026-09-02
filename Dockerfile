# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm build

# Production artifacts on the slim base: the migrator and app stages share
# this one .output layer instead of each copying it from the builder.
FROM node:24-alpine AS output
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output

# One-shot migration runner: plain node plus the bundled script and SQL,
# no pnpm or dev dependencies.
FROM output AS migrator
CMD ["node", ".output/migrate/main.mjs"]

FROM output AS app
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=20397
EXPOSE 20397
CMD ["node", ".output/server/index.mjs"]
