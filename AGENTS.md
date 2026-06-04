IMPORTANT: Keep this file up-to-date. When build paths, integration targets, or the ecosystem layout change, update this document. An outdated AGENTS.md is worse than none.

# AGENTS.md

pnpm monorepo: `frontend` (Nuxt 4) + `backend` (Nitro v3). Load `frontend/AGENTS.md` or `backend/AGENTS.md` for app-specific info.

- Dev: `pnpm dev` from the repo root starts both apps (frontend **20397**, backend **20398**).
- GraphQL at `/graphql` (Pothos, see `backend/server/graphql/schema/AGENTS.md`). In dev, Nuxt proxies `/graphql` to `http://localhost:20398/graphql`.
- Better Auth at `/api/auth` on the backend; Nuxt proxies `/api/auth/**` to `http://localhost:20398/api/auth/**`. See `backend/AGENTS.md` and `frontend/AGENTS.md`.
- Database: PostgreSQL via `docker compose up -d` (port **5433**). Copy `backend/.env.example` to `backend/.env` and set `NITRO_DATABASE_URL`. Drizzle in `backend/server/utils/drizzle.ts`.
- Production Docker: `Dockerfile` has `frontend`, `backend`, and `migrator` targets; `docker-compose.prod.yml` wires frontend → backend over the Docker network and runs migrations via the `migrate` profile.
- Tests: `pnpm test` (backend Vitest + frontend Vitest/Playwright). This template does not ship a default CI workflow; configure one for your deployment target.
- Backend tests: `pnpm --filter ./backend test` (Vitest + PGlite; co-located in `server/graphql/schema/**`, concurrent-safe — see `backend/AGENTS.md`).
- Frontend tests: `frontend/test/{unit,nuxt,e2e}/` — unit (node), Nuxt components (browser), E2E (Playwright + backend PGlite via `dev:mock`).
