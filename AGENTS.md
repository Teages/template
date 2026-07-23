IMPORTANT: Keep this file up-to-date. When build paths, integration targets, or the ecosystem layout change, update this document. An outdated AGENTS.md is worse than none.

# AGENTS.md

Single Nuxt 5 app (`frontend/`) — backend (Better Auth + GraphQL Yoga + Drizzle) was merged into the Nuxt server. Load `frontend/AGENTS.md` for the full picture.

- Dev: `pnpm dev` from the repo root starts the Nuxt dev server on **20397** (real Postgres). Use `pnpm dev:mock` for in-memory PGlite.
- GraphQL at `/graphql` (Pothos + Yoga, see `frontend/server/graphql/schema/AGENTS.md`).
- Better Auth at `/api/auth` (handler: `frontend/server/api/auth/[...all].ts`).
- Database: PostgreSQL via `docker compose up -d` (port **5433**). Copy `frontend/.env.example` to `frontend/.env` and set `NITRO_DATABASE_URL`. Drizzle in `frontend/server/utils/drizzle.ts`.
- Production Docker: `Dockerfile` has `frontend` and `migrator` targets; `docker-compose.prod.yml` wires frontend → postgres and runs migrations via the `migrate` profile.
- Tests: `pnpm test` runs frontend Vitest unit + Nuxt component suites. E2E (`pnpm --filter ./frontend test:browser`) builds the app and runs Playwright against the preview server.
- Frontend tests: `frontend/test/{unit,nuxt,e2e}/` — unit (node), Nuxt components (browser), E2E (Playwright + PGlite via `dev:mock`). In-source GraphQL tests live under `if (import.meta.vitest)` blocks in `frontend/server/graphql/schema/**/operations/*.ts` — these will be wired up in the next migration phase.
