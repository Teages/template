**IMPORTANT: KEEP THIS FILE UP TO DATE**

# AGENTS.md

This is an API-only TypeScript template built on [Nitro v3](https://nitro.build), [h3](https://h3.dev/), [Vite](https://vite.dev/) and [rolldown](https://rolldown.rs/), with Drizzle ORM, Better Auth, and a GraphQL API (Pothos + GraphQL Yoga). There is no frontend: the server renders no HTML, and any route outside the API handlers answers with Nitro's 404.

Refer to `node_modules/nitro/dist/docs/README.md` when working on the server — your Nitro v3 knowledge is likely outdated. This is **not** a Nuxt application: do not introduce `nuxt.config.ts`, route middleware, Nitro auto-import assumptions, or Nuxt composables.

Read the nearest `AGENTS.md` before editing; a nested file overrides this guide for its subtree (e.g. `server/graphql/schema/AGENTS.md`).

## Commands

Use pnpm. Node.js 24+ is required.

```bash
pnpm install
cp .env.example .env      # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm dev                  # in-memory PGlite dev database
pnpm dev:prod             # real Postgres via NITRO_DRIZZLE_CONNECTION_* (NITRO_DRIZZLE_DEV=false)
pnpm build                # Nitro server bundle + standalone migrate script
pnpm preview
pnpm typecheck            # prepare + tsc
pnpm lint
pnpm test                 # unit + e2e (smoke excluded)
pnpm test:unit            # pure Node + in-source
pnpm test:e2e             # full Nitro + PGlite (in-process, dev pipeline)
pnpm test:smoke           # bundled-output smoke against Postgres; pre hook runs pnpm build (compose.dev.yaml)
pnpm db:generate          # generate Drizzle migrations
pnpm db:migrate           # apply migrations (prod DB)
pnpm auth:generate        # regenerate Better Auth schema
docker compose -f compose.dev.yaml up -d   # local Postgres on localhost:5433
docker compose up --build                  # production: Postgres + migrate + app
```

Run `pnpm typecheck`, `pnpm lint`, and the relevant test project for every code change.

CI (`.github/workflows/ci.yaml`) runs lint, typecheck, the in-process test suites, `pnpm build`, and the smoke (real Postgres service) — the only automated coverage for nft-trace and bundled-output regressions, which the dev-pipeline tests cannot see (see `WORKAROUND.md`). `pnpm test:smoke` forces a fresh build through its `pretest:` hook, so it always tests the current sources. Local smoke needs Postgres on localhost:5433 (`docker compose -f compose.dev.yaml up -d`).

## Project Structure

`server/` contains Nitro server code under the supported subdirs: `api/` (`/api`-prefixed handlers for auth, GraphQL, and health), `middleware/`, `plugins/`, `utils/`, `tasks/`, and the domain dirs `graphql/` and `database/`. Root `plugins/` contains local, source-visible Vite plugins and their explicitly wired runtime code; it is distinct from Nitro startup plugins under `server/plugins/`. Read `plugins/AGENTS.md` before editing a template plugin. `test/` is split into `unit/`, `e2e/`, and `smoke/` (production-build suite; skips without a `.output`). Config files: `vite.config.ts` (loads `nitro/vite` and registers the local template plugins), `nitro.config.ts`, `drizzle.config.ts`, and the root `tsconfig.json` that references generated project configs under `.generated/`.

`schema.graphql` and everything under `.generated/` (including `tsconfig.server.json` and `tsconfig.node.json`) are produced by `pnpm prepare` — do not hand-edit them, and regenerate after any GraphQL schema change. `pnpm prepare` empties `.generated` first, so stale artifacts never survive a prepare.

`compose.yaml` is the production stack (Postgres + migrate + app on port 3000). `compose.dev.yaml` is local Postgres only (host 5433). Do not set `NITRO_DRIZZLE_DEV` in Compose. Compose sets Better Auth URL/origins from `APP_ORIGIN` (default `http://localhost:3000`), not from the dev `BETTER_AUTH_URL`. The app reads those values from `process.env` at runtime (`server/utils/auth-env.ts`). Inside Nitro, Postgres credentials come from `useRuntimeConfig().drizzle.connection` (overridden by `NITRO_DRIZZLE_CONNECTION_*`, never a concatenated URI). `drizzle.config.ts` (via `loadDrizzleConfig()`) and the standalone migrate script read the same `NITRO_DRIZZLE_CONNECTION_*` fields. The official Postgres image still uses `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` inside the container; Compose interpolates those from `NITRO_DRIZZLE_CONNECTION_*`.

## Conventions

- **Imports**: server code uses explicit extensionless imports and the `~/*` alias (only `plugins/*/runtime/` keeps `.ts` extensions, per `plugins/AGENTS.md`), and H3 functions from `nitro/h3`. There are no auto-imports anywhere in this template.
- **Template plugins**: every root `plugins/<name>/index.ts` is a Vite plugin entry. Startup side effects are registered there explicitly; callable runtime APIs remain explicit imports from `runtime/server` or `runtime/shared`. Runtime tsconfig globs make files type-visible but do not execute them. Do not add automatic plugin scanning or an external module framework.
- **APIs**: GraphQL is the only API surface, exposed at `/api/graphql` (see `server/graphql/schema/AGENTS.md` for schema conventions). GraphQL documents are type-checked through gazania (`plugins/graphql-schema/runtime/shared/gazania.ts` against `.generated/shared/gazania.d.ts`); e2e tests compose operations with it.
- **Auth**: Better Auth is exposed directly at `/api/auth/*` through the catch-all in `server/api/auth/[...all].ts` (`useAuth().handler`); its built-in origin/CSRF checks and rate limiting apply. GraphQL does not wrap auth operations. Protected fields read the session via `useAuthSession(event)`, or `requireAuthSession(event)` (which resolves a 401 as an `UnauthorizedError`).
- **Database**: tables in `server/database/schema.ts`, relations in `server/database/relations.ts`; `server/database/index.ts` is the single schema entry (direct table exports plus `relations`) consumed by `@teages/nitro-drizzle`. The module is registered in `nitro.config.ts` (`modules: [NitroDrizzle]`) with `drizzle: { dialect, driver, schemaPath, migrationsDir, dev }`. `useDrizzle()` (explicit import from `@teages/nitro-drizzle/runtime`) lazily returns `{ db, schema, relations }` — call it inside handlers/resolvers/procedures/tests, never at module scope. In dev the module pushes the schema into an in-memory PGlite on startup (`drizzle.dev: true`; opt out per run with `NITRO_DRIZZLE_DEV=false`); the `db:reset` task (drop, re-push, re-seed) replaces tests' reset, and the `drizzle:dev:seed` nitro hook seeds after every push or reset. `drizzle.config.ts` is just `loadDrizzleConfig()`; generate migrations with `pnpm db:generate` and never hand-edit snapshots. Keep pagination deterministic (unique tie-breaker after timestamps).
- **Tests**: reset PGlite before mutating shared data. Test auth/validation failures, ordering, pagination boundaries. Keep GraphQL e2e assertions in the operation suite under `test/e2e/api/graphql/` — never weaken assertions to hide nondeterministic ordering.

Install repository skills with `pnpm skills:install`.
