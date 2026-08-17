# Auth Engine

Better Auth is an internal authentication engine. The public contract is GraphQL
(`session`, `signUpEmail`, `signInEmail`, `signOut`). Do not mount
`/api/auth/*` as a catch-all.

Call Better Auth only through `server/auth/operations.ts`. Map every public
parameter explicitly. Never forward a GraphQL input object into `auth.api.*`.
Forward the incoming request headers and collect every `Set-Cookie` Better Auth
returns.

Rate limits and GraphQL Origin / Content-Type checks live outside Better Auth.
`auth.api.*` does not run Better Auth plugin middleware or its built-in limiter.

Auth mutation limits use Nitro KV (`useStorage('better-auth:rate-limit')`), a
memory mount declared in `nitro.config.ts`. Do not keep a process-local `Map`.

## Plugin audit

Before enabling a Better Auth plugin or exposing one of its operations:

- [ ] Which operations do we actually need?
- [ ] Is GraphQL limited to an explicit allowlist?
- [ ] Are there server-only parameters?
- [ ] Does the endpoint depend on request-only plugin middleware?
- [ ] Does it define a dedicated rate limit we must recreate?
- [ ] Does it write `Set-Cookie`?
- [ ] Does it return a redirect / `Location` that must become a GraphQL result?
- [ ] Does it add a protocol HTTP route that must be allowlisted?
- [ ] Must we pass the full request headers?
- [ ] Does it change session or authorization semantics?

OAuth / OIDC protocol endpoints stay as HTTP routes if a plugin requires them.
Add those routes to an explicit allowlist — do not restore a catch-all handler.
