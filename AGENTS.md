# AGENTS.md

## Setup commands
- Install deps: `pnpm install` (from repo root or this package)
- Start dev server: `pnpm dev` from repo root (port **20397**; proxies API to backend **20398**)
- Run tests: `pnpm test:unit`, `pnpm test:nuxt`, `pnpm test:browser` (E2E starts backend `dev:mock` with PGlite + Nuxt preview)

## Frameworks / Libraries
- Nuxt 4
- Nitro
- Nuxt UI 4
- Tailwind CSS
- VueUse
- Gazania + GraphQL (`useApiClient`, proxied `/graphql` → `http://localhost:20398/graphql`)
- Better Auth (`better-auth/vue`): `authClient` in `app/utils/auth-client.ts`.

## Frontend architecture (hub-frontend style)

- **Queries/mutations:** `gazania.query(...)` / `gazania.mutation(...)` in pages, executed via `useApiClient().request()`.
- **Data loading:** `useAsyncData` per route; call `refresh()` after mutations.
- **UI:** feature components under `app/components/<domain>/`; page orchestrates data + events.
- **Schema types:** `modules/gazania` codegen from `../backend/server/graphql/schema.graphql`.

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
