This project is based on [Nitro v3](https://nitro.build), [h3](https://h3.dev/), [Vite](https://vite.dev/) and [rolldown](https://rolldown.rs/).

Refer to `node_modules/nitro/dist/docs/README.md` when working on server (your knowledge about Nitro v3 is likely outdated!).

## Project Structure

`server/` contains server-side code with supported subdirs (create as needed): `api/` (/api prefixed handlers), `routes/` (non-prefixed route handlers), `middleware/`, `plugins/`, `utils/`, `assets/`, and `tasks/`. `public/` holds static assets (copied, not bundled). Config files: `vite.config.ts` (loads `nitro/vite` plugin), `nitro.config.ts` (serverDir, routeRules, preset, etc.), `tsconfig.json` (extends nitro/tsconfig, `~/*` path alias).

## Conventions

- Path alias `~/*` (tsconfig), NEVER use explicit `.ts` extensions

## Auth (Better Auth)

- **Runtime:** `useAuth()` in `server/utils/auth.ts` (lazy init with `useDrizzle().db`). Handler: `server/api/auth/[...all].ts` → `/api/auth/*`.
- **Schema:** generated tables in `server/database/auth.ts` (re-exported from `schema.ts`; `relations` merged in `relations.ts`). App tables stay in `schema.ts` beside the auth re-exports.
- **CLI generate:** `pnpm auth:generate` → `better-auth generate --config ./server/utils/auth.ts --output ./server/database/auth.ts`. Uses the deprecated `export const auth` stub in the same file (dummy DB). After generate, if the CLI duplicated `defineRelationsPart` in `auth.ts`, keep a single relations block and ensure `relations.ts` still spreads `authRelations`.
- **Env:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` in `backend/.env` (see `.env.example`). `trustedOrigins` includes frontend `http://localhost:20397` and backend `http://localhost:20398`.
- **Adapter:** `@better-auth/drizzle-adapter/relations-v2` with `usePlural: true` (Drizzle ORM v1 RC; `patches/@better-auth__drizzle-adapter.patch` required).

## Database

- `useDrizzle()` in `server/utils/drizzle.ts` (connection from `runtimeConfig.databaseUrl` / `NITRO_DATABASE_URL`).
- PGlite helpers in `server/utils/pglite-db.ts`; E2E uses `pnpm dev:mock` (`MOCK_DATABASE=true`) and `POST /_nitro/tasks/db:reset` to reset DB.
- Schema: `server/database/schema.ts`; migrations in `server/database/migrations/`.
- `pnpm db:generate` — new migration; `drizzle-kit migrate` or `pnpm task:db:migrate` (dev server) to apply.
- `pnpm db:studio` — Drizzle Studio (requires `NITRO_DATABASE_URL` in `.env`).

## GraphQL

- Code-first **Pothos** + **Drizzle plugin**, served by **GraphQL Yoga** at `/graphql` (`server/routes/graphql.ts`).
- Layout and conventions: `server/graphql/schema/AGENTS.md`.
- After schema changes: `pnpm schema:update` (dev HMR via `server/plugins/graphql-hmr.ts` regenerates `schema.graphql` + `gazania.ts`).
- Typed client: `~/server/utils/gazania.ts`; tests use `createGraphQLTestClient(serverFetch)` from `~/test/utils.ts`.

## Testing

- Vitest + in-memory PGlite (`test/setup.ts` mocks `useDrizzle()`).
- GraphQL: co-located tests in `server/graphql/schema/**/operations/*.ts` via `createGraphQLTestClient(serverFetch)` + `gazania`.
- DB setup in a test: `useDrizzle()` + insert rows; do not rely on global seed counts.
- **Shared single-worker model (e2e):** the e2e project uses `isolate: false` + `maxWorkers: 1` so **all e2e files share ONE Nitro instance and ONE PGlite database** in ONE worker process (see `vitest.config.ts`). This avoids re-booting Nitro per file. Each `it` must use its own unique fixture key (e.g. `uniqueTodoTitle()` in `test/utils.ts`) and assert only on rows matching that key. Never assume exclusive DB state or fixed row counts. Call `resetTestDatabase()` (from `test/utils.ts`) in `beforeEach` only when a test needs a fully clean slate.
- `pnpm test` / `pnpm test:watch`; `pnpm typecheck`.
