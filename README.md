# Full-stack API template

A login-required Count App demonstrating interchangeable **REST**, **GraphQL**, and **tRPC** API designs on Vue 3 SSR, [Nitro](https://nitro.build/), [Vite](https://vite.dev/), Drizzle ORM, Better Auth, and [Nuxt UI](https://ui.nuxt.com). Bootstrapped from the [nitro vite-ssr-vue-router example](https://github.com/nitrojs/nitro/tree/main/examples/vite-ssr-vue-router).

Requires **Node.js 24+** and **pnpm**. See [`AGENTS.md`](./AGENTS.md) for repository conventions.

## Getting started

```bash
pnpm install
cp .env.example .env
# Set BETTER_AUTH_SECRET (openssl rand -base64 32)

# Dev with in-memory PGlite (no Docker)
pnpm dev

# Dev against Postgres
docker compose -f compose.dev.yaml up -d
pnpm db:migrate
pnpm dev:prod
```

Open http://localhost:20398, sign up, and pick an API implementation:

- `/` — GraphQL (code-first Pothos schema, Relay pagination)
- `/rest` — resource-oriented REST (HTTP status, opaque cursor pagination)
- `/trpc` — end-to-end typed procedures (Zod-validated input)

All three operate on the same count-event business model. A real project keeps the API style it needs rather than shipping all three.

## Deploying

Docker Compose runs Postgres, applies Drizzle migrations, then starts the Nitro production server. Bare `docker compose up` is this production stack — local Postgres-only dev uses `-f compose.dev.yaml`.

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET (openssl rand -base64 32)
# Local compose defaults APP_ORIGIN to http://localhost:3000 (not the Vite :20398 URL).
# For a real host: APP_ORIGIN=https://example.com
# and BETTER_AUTH_ALLOWED_HOSTS=example.com,example.com:*
docker compose up --build
```

Open http://localhost:3000. Put a reverse proxy in front for TLS. If the proxy forwards `X-Forwarded-*` / `Host`, Better Auth may need `advanced.trustedProxyHeaders: true`.

Without Docker:

```bash
pnpm build
pnpm preview
```

Then check the [Nitro deployment docs](https://nitro.build/deploy) for the different deployment presets.
