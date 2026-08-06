# Full-stack API template

Login-required Count App demonstrating interchangeable REST, GraphQL, and tRPC API designs on Vue SSR, Nitro, Drizzle, Better Auth, and [Nuxt UI](https://ui.nuxt.com).

Bootstrapped from the [nitro vite-ssr-vue-router example](https://github.com/nitrojs/nitro/tree/main/examples/vite-ssr-vue-router), with database/auth/testing patterns from [Teages/template@fullstack](https://github.com/Teages/template/tree/fullstack).

Requires **Node.js 24+** and **pnpm**.

## Quick start

```bash
pnpm install
cp .env.example .env
# Set BETTER_AUTH_SECRET (openssl rand -base64 32)

# Dev with in-memory PGlite (no Docker)
pnpm dev

# Dev against Postgres
docker compose up -d
pnpm db:migrate
pnpm dev:prod
```

Open http://localhost:20398, sign up, and choose an API implementation:

- `/` — GraphQL with a code-first schema and Relay pagination
- `/rest` — resource-oriented REST with HTTP status and cursor conventions
- `/trpc` — end-to-end typed procedures with Zod input validation

All three operate on the same count-event business model. A real project is expected to keep the API style it needs rather than ship all three.

## Scripts

```bash
pnpm dev            # MOCK_DATABASE=true (PGlite)
pnpm dev:prod       # real Postgres via NITRO_DATABASE_URL
pnpm build
pnpm preview
pnpm typecheck

pnpm test           # all unit and e2e tests
pnpm test:unit      # pure Node + in-source
pnpm test:e2e       # full Nitro + Vue stack
pnpm test:watch     # unit tests in watch mode

pnpm db:generate    # generate Drizzle migrations
pnpm db:migrate     # apply migrations (prod DB)
pnpm db:studio      # Drizzle Studio GUI
pnpm auth:generate  # regenerate Better Auth schema from server/utils/auth.ts

pnpm task:db:migrate # apply migrations via Nitro task (prod DB)
pnpm task:db:reset   # reset mock DB (dev only)
```

## Stack

- **Auth**: Better Auth email/password at `/api/auth/*`
- **DB**: Drizzle ORM + Postgres (prod) / PGlite (dev & tests)
- **REST**: `/api/count-events` — collection/detail resources, `201 Location`, opaque cursor pagination
- **GraphQL**: Pothos + Yoga at `/api/graphql` — Relay connections and mutation payloads; generated SDL in `schema.graphql`
- **tRPC**: `/api/trpc` — inferred client types, protected procedures, and Zod-validated cursor input
- **Tests**: Vitest projects — `unit` (pure Node) and `e2e` (Nitro/PGlite + Vue SSR)

## API design contract

The transports intentionally use their ecosystem conventions rather than sharing one response envelope:

| Capability | REST | GraphQL | tRPC |
|---|---|---|---|
| List events | `GET /api/count-events` | `countEvents` Relay connection | `count.list` query |
| Total | `meta.total` | `count` field | `total` |
| Record click | `POST /api/count-events` | `recordCount` mutation payload | `count.create` mutation |
| Pagination | opaque HTTP cursor | Relay `first` / `after` | typed `limit` / `cursor` input |

The e2e contract test creates data through all three transports and verifies that they expose the same totals, event identities, ordering, and ownership.

## Request-scoped `$fetch`

The Vue app context exposes an ofetch instance as `$fetch`, similar to Nuxt. During SSR it is created per request, resolves relative URLs through Nitro, and forwards only that request's cookies. API clients must be created from `useAppContext().$fetch`; never replace `globalThis.fetch`.

## Nuxt UI

Configured for Vue + Vite per the [official docs](https://ui.nuxt.com/docs/getting-started/installation/vue):

- `@nuxt/ui` Vite plugin in `vite.config.ts`
- Vue plugin registered in `app/entry-client.ts` and `app/entry-server.ts`
- Tailwind + Nuxt UI CSS in `app/assets/css/main.css`
- Root wrapped with `UApp` in `app/app.vue`

## Auto-imports

The `@nuxt/ui` Vite plugin embeds `unplugin-auto-import` and `unplugin-vue-components` and exposes them through its `autoImport` / `components` options (configured in [`vite.config.ts`](./vite.config.ts)). Do **not** install those two `unplugin-*` packages separately — `@nuxt/ui` detects duplicates and throws at build start.

Available without imports, mirroring Nuxt's defaults:

| Source | What you get |
|---|---|
| `vue` | `ref`, `computed`, `watch`, `onMounted`, `h`, `provide`, `inject`, `nextTick`, `defineComponent`, … |
| `vue-router` | `useRoute`, `useRouter`, `onBeforeRouteLeave`, `onBeforeRouteUpdate`, `useLink`. `<RouterLink>` / `<RouterView>` are globally registered. |
| `@nuxt/ui` composables | `useToast`, `useOverlay`, `useKbd`, `useFormField`, `useAppConfig`, `defineShortcuts`, … |
| `app/utils/**` | every named export — e.g. `authClient`, `signIn`, `signUp`, `signOut`, `useSession`, `authNavigationGuard` |
| `app/composables/**` | every named export |
| `app/components/**/*.vue` | auto-registered as global components (file name = component name, directory-prefixed for nested files) |

Declarations are written to `.generated/app/auto-imports.d.ts` and `.generated/app/components.d.ts` on `dev` / `build`. The `.generated/` directory is gitignored and referenced from `tsconfig.json`.

### Notes

- New `useXxx` composables are picked up automatically; restart `pnpm dev` for the first reference to surface in `.generated/app/auto-imports.d.ts`.
- For server-side code under `server/`, keep explicit imports — auto-import is configured for the Vue app only.
- `entry-client.ts` / `entry-server.ts` keep explicit imports for clarity (they bootstrap the auto-import plugin).
