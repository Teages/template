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
docker compose up -d
pnpm db:migrate
pnpm dev:prod
```

Open http://localhost:20398, sign up, and pick an API implementation:

- `/` — GraphQL (code-first Pothos schema, Relay pagination)
- `/rest` — resource-oriented REST (HTTP status, opaque cursor pagination)
- `/trpc` — end-to-end typed procedures (Zod-validated input)

All three operate on the same count-event business model. A real project keeps the API style it needs rather than shipping all three.

## Deploying

```bash
pnpm build
pnpm preview
```

Then check the [Nitro deployment docs](https://nitro.build/deploy) for the different deployment presets.
