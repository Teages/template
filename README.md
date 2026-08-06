# fullstack template

Login-required Count App built with Vue SSR, Vue Router, Vite, Nitro, Drizzle, Better Auth, and [Nuxt UI](https://ui.nuxt.com).

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

Open http://localhost:20398 — sign up, sign in, click **Count**. Each click records who clicked and when in the event feed.

## Scripts

```bash
pnpm dev            # MOCK_DATABASE=true (PGlite)
pnpm dev:prod       # real Postgres via NITRO_DATABASE_URL
pnpm build
pnpm preview
pnpm typecheck

pnpm test           # unit only (fast default)
pnpm test:unit      # pure Node + in-source
pnpm test:api       # Nitro + PGlite serverFetch
pnpm test:e2e       # full Nitro + Vue stack
pnpm test:full      # unit + api + e2e
pnpm test:watch     # unit + api watch mode
pnpm test:bundle    # build + SSR bundle regression

pnpm db:generate    # generate Drizzle migrations
pnpm db:migrate     # apply migrations (prod DB)
pnpm db:studio      # Drizzle Studio GUI
pnpm auth:generate  # regenerate Better Auth schema from server/utils/auth.ts
pnpm schema:update  # regenerate schema.graphql + .generated/shared/gazania.d.ts

pnpm task:db:migrate # apply migrations via Nitro task (prod DB)
pnpm task:db:reset   # reset mock DB (dev only)
```

## Stack

- **Auth**: Better Auth email/password at `/api/auth/*`
- **DB**: Drizzle ORM + Postgres (prod) / PGlite (dev & tests)
- **API**: `GET/POST /api/count` — requires session; returns `{ count, events }`
- **GraphQL**: Pothos + Yoga at `/api/graphql` — `count`, `countEvents`, `recordCount` (code-first; SDL in `schema.graphql`)
- **Tests**: Vitest projects — `unit` (pure Node), `api` (Nitro/PGlite), `e2e` (Nitro + Vue)

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
