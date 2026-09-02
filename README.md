## Use this template

```bash
npx giget@latest gh:teages/template#fullstack package-name
```

# Fullstack App

Single Nuxt app: the Nitro server serves the UI, `/graphql`, and `/api/auth/**` from one origin. Database access is managed by [`@teages/nitro-drizzle`](https://www.npmjs.com/package/@teages/nitro-drizzle) — `pnpm dev` runs on an in-memory PGlite dev database (with Drizzle Studio link) and needs no Postgres.

## Database

```bash
pnpm db:generate       # create a migration from schema changes
pnpm db:migrate        # apply migrations (targets POSTGRES_* from .env)
pnpm db:studio         # inspect the real database
pnpm docker:up         # local Postgres on port 5433 (docker-compose.dev.yml)
```

To develop against the real local Postgres instead of the dev database, run with `NITRO_DRIZZLE_DEV_MOCK=false pnpm dev`.

## Production Docker

Build the production images and start Postgres and the app:

```bash
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
docker compose up --build -d
```

Run migrations as an explicit one-off step:

```bash
docker compose --profile migrate run --rm migrate
```

Set `APP_ORIGIN` to the public origin in real deployments, for example `https://app.example.com`. The app container connects to Postgres over the Docker network using the `POSTGRES_*` environment variables.
