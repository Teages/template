# Repository Guide

This repository is a full-stack TypeScript template. It uses Vue SSR with file-based Vue Router, Vite, Nitro, Drizzle ORM, Better Auth, Nuxt UI, Vitest, and three alternative API styles: REST, GraphQL, and tRPC.

The project is not a Nuxt application. Do not introduce Nuxt-only conventions such as `nuxt.config.ts`, route middleware, Nitro auto-import assumptions, or Nuxt composables unless the task explicitly migrates the project to Nuxt.

## Required Workflow

1. Read the nearest `AGENTS.md` before editing files. A nested file overrides this guide for its subtree.
2. Inspect existing code and tests before choosing an implementation pattern.
3. Keep changes focused. Preserve unrelated user changes in a dirty worktree.
4. Run the narrowest relevant tests while iterating, then run the required verification before handoff.
5. Keep commits small and coherent when the task requests commits. Do not mix unrelated cleanup into a feature commit.

## Commands

Use pnpm. The repository requires Node.js 24 or newer.

```bash
pnpm prepare       # regenerate GraphQL schema/types and app declarations
pnpm typecheck     # run prepare, then vue-tsc
pnpm lint          # run ESLint
pnpm test:unit     # unit tests only
pnpm test:e2e      # Nitro/PGlite/Vue SSR tests
pnpm test          # all tests
pnpm build         # production client, SSR, and Nitro build
```

Run `pnpm typecheck`, `pnpm lint`, and the relevant test project for every code change. Run `pnpm test` and `pnpm build` before handing off broad or production-sensitive changes.

## Project Layout

| Path | Purpose |
|---|---|
| `app/` | Vue pages, composables, app utilities, and SSR/client entry points |
| `server/api/` | Nitro HTTP handlers for REST, GraphQL, tRPC, and auth |
| `server/rest/` | REST-specific application logic and resource shapes |
| `server/graphql/` | Pothos schema, Yoga integration, and GraphQL operations |
| `server/trpc/` | tRPC context, routers, and tRPC-specific services |
| `server/database/` | Drizzle schema, relations, and migrations |
| `plugins/` | Local Vite plugins used by this template |
| `test/unit/` | Pure unit tests |
| `test/e2e/` | In-process Nitro, PGlite, API, and SSR tests |

## Vue and SSR

- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Use the auto-imports configured in `vite.config.ts` inside `app/`. Keep explicit imports in entry files when they clarify bootstrap dependencies.
- Keep server-side imports explicit. Nitro route handlers must import `defineHandler` and other H3 functions from `nitro/h3`.
- Access the request-scoped ofetch instance through `useAppContext().$fetch`.
- Never replace or mutate `globalThis.fetch`. SSR requests run concurrently, so global fetch state can leak origins or cookies across requests.
- Create GraphQL, REST, and tRPC clients from the injected `$fetch`.
- Keep SSR and client navigation authorization aligned through the shared helpers in `app/utils/auth-routes.ts`.

## API Design

REST, GraphQL, and tRPC expose the same count-event business capabilities, but each implementation follows its ecosystem conventions. Do not force them into one shared transport response envelope.

- REST uses resource URLs, HTTP status codes, `Location`, and opaque cursor pagination.
- GraphQL uses a code-first Pothos schema, Relay connections, non-null fields by default, and mutation payload types.
- tRPC uses typed procedures, Zod input validation, and router-inferred client types.

When business behavior changes, update all three implementations or explicitly document why the change applies to only one. Extend `test/e2e/api/count-contract.test.ts` when the shared business contract changes.

## Authentication

- Better Auth owns `/api/auth/*`.
- Server middleware loads the session once per H3 event. Handlers and resolvers must read it through `useAuthSession`.
- Protected REST and GraphQL operations use `useAuthSession(event, 'required')`.
- Protected tRPC procedures use `protectedProcedure`.
- Do not trust client navigation guards as API authorization.
- Never commit secrets. Keep environment variable names and safe examples in `.env.example`.

## Database and Migrations

- Define application tables in `server/database/schema.ts` and relations in `server/database/relations.ts`.
- Call `useDrizzle()` inside request handlers, resolvers, procedures, and tests. Do not capture a database instance at module scope.
- Generate migrations with `pnpm db:generate`; do not hand-edit snapshots.
- Review generated SQL before applying or committing a migration.
- Keep pagination ordering deterministic. Use a unique tie-breaker such as `id` after timestamps.

## Generated Files

`pnpm prepare` generates `schema.graphql` and files under `.generated/`.

- Do not hand-edit `.generated/`.
- Treat TypeScript GraphQL schema files as the source of truth and commit the regenerated `schema.graphql`.
- Regenerate after changing GraphQL schema fields, nullability, arguments, or payloads.

## Testing

- Reset PGlite state before tests that mutate shared data.
- Test authentication failures, successful operations, validation failures, ordering, and pagination boundaries.
- Keep transport-specific protocol assertions in their transport suite.
- Keep cross-transport business equivalence assertions in `test/e2e/api/count-contract.test.ts`.
- Do not weaken assertions to accommodate nondeterministic ordering; fix the ordering instead.

## Skills

Use a repository skill when its trigger matches the task. Read the full `SKILL.md` before acting, then load only the references relevant to the current work.

- Vue components and composables: start with `vue-best-practices`, then use `vue` for framework API details. Add `vue-router-best-practices` for routing and `vue-testing-best-practices` plus `vitest` for tests.
- UI implementation and review: use the official `nuxt-ui` skill for components and theming, and `web-design-guidelines` for accessibility or UX review. Nuxt UI works with Vue and Vite; do not load Nuxt framework skills.
- Client and build tooling: use `vite` for Vite configuration and plugins, and `pnpm` for dependency, workspace, or package-manager work.
- Nitro server work: use `nitro` for configuration, handlers, routing, storage, caching, and deployment. Keep imports and runtime behavior consistent with the versions installed in this repository.
- tRPC: start with `trpc-router`, then load the task-specific official skill: `client-setup`, `adapter-fetch`, `validators`, or `error-handling`.
- GraphQL: use `graphql-schema` for schema and resolver design, `graphql-operations` for queries and mutations, and `gazania` when authoring typed client documents. The nested GraphQL `AGENTS.md` still takes precedence for file layout and local conventions.
- Better Auth: use `better-auth-best-practices` for general integration, `better-auth-security-best-practices` for security-sensitive changes, and `email-and-password-best-practices` for credential flows.
- Drizzle migrations: use the matching local workflow skill: `drizzle-migrations`, `drizzle-generate`, `drizzle-push`, `drizzle-hints`, `drizzle-output-modes`, or `drizzle-responses-and-errors`. Do not use `drizzle-push` when the task requires a committed migration.
- Documentation and skill maintenance: use `writing-web-documentation` for repository docs and `find-skills` only when the current inventory does not cover the task.

Prefer framework-maintainer or established ecosystem-owner skills. A skill is guidance, not authority to overwrite repository conventions, installed dependency behavior, or a nearer `AGENTS.md`.
