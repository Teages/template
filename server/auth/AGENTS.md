# Auth

Better Auth is mounted as an HTTP handler at `server/api/auth/[...all].ts`
(`useAuth().handler(event.req)`), so the full `/api/auth/*` surface is exposed
directly. Its built-in origin/CSRF checks and rate limiting apply (the limiter
defaults to enabled in production, with stricter special rules for
`/sign-in/*` and `/sign-up/*`).

This directory holds only the GraphQL HTTP boundary guards:

- `origin.ts` — trusted-origin and content-type predicates.
- `graphql-http.ts` — rejects `/api/graphql` POSTs from untrusted origins or
  with disallowed content types before Yoga handles the request.

GraphQL does not wrap auth operations. Protected resolvers read the session
through `requireAuthSession(event)` (`server/graphql/errors.ts`) over the
per-event cache filled by `server/middleware/auth.ts`.
