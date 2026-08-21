**IMPORTANT: KEEP THIS FILE UP TO DATE**

# Template Plugins

Each direct child of this directory is a local Vite plugin inspired by Nuxt
modules, but its glue stays in this repository so developers and agents can
read the complete integration.

## Shape

```text
plugins/<name>/
├── index.ts              # Vite PluginOption factory and explicit wiring
└── runtime/
    ├── app/              # browser and Vue SSR app code
    ├── server/           # Nitro/H3 runtime code
    ├── node/             # build/test host runtime code
    └── shared/           # genuinely isomorphic types or pure logic only
```

Only create runtime directories that the plugin needs. Build-time helpers that
are not shipped to an app or server environment stay beside `index.ts`.

## Wiring

- Every plugin is registered explicitly from a Vite config or another named
  test/build composition root. Do not scan this directory to auto-register
  plugins.
- Register startup side effects in `index.ts`: use Vite hooks, `nitro.setup`,
  `nitro.options.routes`, `nitro.options.plugins`, or virtual modules as the
  target environment requires.
- Keep callable runtime APIs explicit at their consumer. Do not inject ordinary
  functions globally. The one opt-in exception mirrors Nuxt modules: files under
  `runtime/app/composables/` and `runtime/app/utils/` are scanned into app
  auto-imports by `plugins/auto-import` — a plugin that wants a composable or
  util available bare inside `app/` (like `useAppContext`) puts it there; every
  other runtime API stays an explicit import.
- The runtime globs in `plugins/tsconfig/index.ts` provide type visibility only;
  they do not load or execute runtime files.
- Direct local dependencies are preferable to capability registries or generic
  module abstractions. If removing a plugin breaks a required import, typecheck
  and tests should expose that dependency clearly.

## Vue Runtime Plugins

`app/plugins/` is the one deliberate auto-loading boundary. It is owned by
`plugins/vue-ssr` and does not change the explicit registration rule for this
root directory.

- Only top-level `app/plugins/*.ts` files are loaded. Use `.client.ts` and
  `.server.ts` suffixes for environment-specific setup.
- Default-export `defineVuePlugin(...)`, imported explicitly from the Vue SSR
  runtime. Plugins receive the app, router, app context, query cache, and
  environment-specific request/head context; do not call component-level
  `inject()` during plugin setup.
- Files execute sequentially in path order and fail fast. A server plugin may
  return a `Response` to stop rendering; a client plugin must return nothing.
- Keep module evaluation free of startup work. Put effects inside the setup
  function; a static CSS import owned by that plugin is the only current
  exception.
- Vue `provide`/`inject` keys must be registry symbols —
  `Symbol.for('template:<name>')`, never `Symbol(...)`. Nitro's dev worker
  re-imports the SSR entry after each edit while request-time `import()`s
  re-evaluate fresh, and both module copies can meet in one straddled render;
  a registry symbol is the same key in both copies (see `APP_CONTEXT_KEY`).
  Verified 2026-08-21 (nitro-nightly 3.0.1-20260821) that the dev worker
  converges on edits without a custom reload plugin — Vite itself sends the
  ssr environment's `full-reload` — so the straddle window is per-edit
  transient, not permanent staleness.
- Do not add object syntax, dependency graphs, parallel execution, hooks, or
  automatic global provides without a concrete requirement and new tests.

## Boundaries

- Move code here only when one plugin clearly owns its lifecycle or public
  concept. “Business independent” alone is not enough.
- Runtime code must not depend on count-event pages, handlers, database tables,
  or other demo-domain implementation.
- Server runtime uses explicit imports with the `~/*` alias and `.ts`
  extensions. App runtime may rely on Vue auto-imports only at Vue SFC consumer
  sites, not inside plugin TypeScript modules.
- Do not create catch-all `utils`, `common`, or `shared` logic collections.
- Do not build a universal runtime loader until at least two concrete plugins
  require the same mechanism and the duplication has a demonstrated cost. The
  scoped `app/plugins/` loader above is not a root template-plugin scanner.

## Tests

Place plugin unit tests under `test/unit/plugins/<name>/`. Test both the
build-time wiring in `index.ts` and observable runtime behavior. Run
`pnpm typecheck`, `pnpm lint`, and the relevant Vitest project after every
plugin change; run dev/build/preview smoke tests when lifecycle or workaround
code changes.
