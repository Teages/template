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
  functions globally or expand app auto-imports to all plugin runtime files.
- The runtime globs in `plugins/tsconfig/index.ts` provide type visibility only;
  they do not load or execute runtime files.
- Direct local dependencies are preferable to capability registries or generic
  module abstractions. If removing a plugin breaks a required import, typecheck
  and tests should expose that dependency clearly.

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
  require the same mechanism and the duplication has a demonstrated cost.

## Tests

Place plugin unit tests under `test/unit/plugins/<name>/`. Test both the
build-time wiring in `index.ts` and observable runtime behavior. Run
`pnpm typecheck`, `pnpm lint`, and the relevant Vitest project after every
plugin change; run dev/build/preview smoke tests when lifecycle or workaround
code changes.
