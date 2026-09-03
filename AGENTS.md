# AGENTS.md

## Setup commands
- Install deps: `pnpm install` (from repo root or this package)
- Start dev server: `pnpm dev` from repo root (port **20397**, serves the app, `/graphql`, and auth API from one origin; runs on an in-memory PGlite dev database by default)
- Run tests: `pnpm test:unit`, `pnpm test:api`, `pnpm test:e2e`, `pnpm test:nuxt`.
  - `unit` (test/unit): pure Node, no Vite/Nitro plugins.
  - `api` (test/api): server tests running in-process inside the nitro vite environment — `serverFetch` from `nitro/app` hits the real app, `useDrizzle()` from `#drizzle` shares the app's PGlite database directly (no tasks needed). Only this project may touch the database this way.
  - `e2e` (test/e2e, `*.spec.ts`): Playwright-driven browser e2e inside vitest — global-setup boots a dev server (PGlite, port 20398) and a shared chromium `launchServer`; fixtures in test/e2e/test-utils.ts, auth state provisioned via the typed Better Auth client in test/e2e/utils/auth.ts.

## Frameworks / Libraries
- Nuxt 5 (nightly)
- Nitro
- Nuxt UI 4
- Tailwind CSS
- VueUse
- Drizzle ORM via `@teages/nitro-drizzle` (`useDrizzle()` from `#drizzle`; `db:*` scripts run drizzle-kit against `POSTGRES_*` env vars)
- Gazania + GraphQL (`useApiClient`, same-origin `/graphql`)
- Better Auth (`better-auth/vue`): `authClient` in `app/utils/auth-client.ts`.

## Frontend architecture (hub-frontend style)

- **Queries/mutations:** `gazania.query(...)` / `gazania.mutation(...)` in pages, executed via `useApiClient().request()`.
- **Data loading:** `useAsyncData` per route; call `refresh()` after mutations.
- **UI:** feature components under `app/components/<domain>/`; page orchestrates data + events.
- **Schema types:** `modules/gazania` codegen from `./server/graphql/schema.graphql`.

## Code style
- use strict TypeScript, avoid `any`
- Single quotes, no semicolons
- Linting with ESLint, will auto-fix on save in VSCode, the agents **SHOULD NOT** do this manually

## Agents Guidelines
- Write clear, concise, and well-documented code
- Follow best practices for security and performance
- Ensure code is modular and reusable
- Checkout the document when using libraries or frameworks components
- Commit messages should be clear and descriptive
- Avoid committing generated files or dependencies
