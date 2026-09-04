# API Test Guide

Server-side tests running in-process inside the nitro vite environment (wired up in `test/projects/api.ts`). Domain-specific conventions live in subdirectories, such as `test/api/graphql/AGENTS.md`.

## Environment

Run with `pnpm test:api` (include pattern: `test/api/**/*.{test,spec}.ts`); scope to a subtree with `pnpm test:api test/api/<path>`.

- The `nitro` vitest environment boots the real Nitro app in-process. `serverFetch` from `nitro/app` dispatches requests to it without a network port.
- Tests run in the app's own process, so server utilities can be imported and called directly — e.g. `useAuth()` from `#server/utils/auth`. Prefer direct calls over HTTP round-trips when the HTTP boundary is not what's under test.
- `useDrizzle()` from `#drizzle` returns the app's PGlite database — this is the only test project allowed to touch the database directly.
- The project runs with `isolate: false` and a single worker: one app instance and one database are shared by every file in a run. Never rely on execution order or a clean database — each test seeds its own data.

## Auth

- Call Better Auth's server API directly via `useAuth()` from `#server/utils/auth` — sign up, sign in, etc. without HTTP. Since the app shares the same process and instance, sessions created this way are honored by the app's own auth checks.
- Authenticated requests still carry the session as headers: pass the session cookie in the `cookie` header of subsequent `serverFetch` calls; omit it to exercise unauthenticated behavior.
- Each test creates its own user with a unique email — tests never share rows and need no cleanup.

## Seeding

- For read-path fixtures, insert rows directly via `useDrizzle()`; when the code under test is a write path, create data through the API itself so the path under test is what gets exercised.
- Foreign keys need real rows — insert referenced parents (e.g. users) before children.
- Set explicit timestamp values when a test depends on ordering; `createdAt`-style columns default to `now()`.
