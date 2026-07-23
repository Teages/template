# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS build-frontend
RUN pnpm --filter ./frontend build

FROM deps AS migrator
CMD ["pnpm", "--filter", "./frontend", "db:migrate"]

FROM node:24-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=20397
COPY --from=build-frontend /app/frontend/.output ./.output
EXPOSE 20397
CMD ["node", ".output/server/index.mjs"]
