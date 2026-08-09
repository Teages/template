# Workaround

Inventory of patches, workarounds, and accepted deviations from upstream or
type-safe conventions. Each entry lists why it exists, which lifecycle stages
it affects, where it is patched, and what would let us remove it.

Stages: `dev` = `pnpm dev`, `test` = `pnpm test`, `build` = `pnpm build`.

---

## Problems and workarounds

### OpenTelemetry semantic-conventions ships extensionless ESM imports
- reason: `@opentelemetry/semantic-conventions@1.43.0` ESM build uses
  extensionless specifiers (`export * from './trace'`) and a CJS-style
  `main`/`exports` map. Under strict Node ESM and the Vite SSR ModuleRunner
  these fail to resolve. The package also lacks `"type": "module"`.
- affected: dev, build
- patched: `patches/@opentelemetry__semantic-conventions@1.43.0.patch` — rewrites
  internal imports/exports to include `.js` extensions, points `main`/`exports`
  at the ESM build, and adds `"type": "module"`. Registered in
  `pnpm-workspace.yaml` under `patchedDependencies`.
- follow up: Remove once upstream ships proper `.js` ESM specifiers. Track
  open-telemetry/opentelemetry-js and bump the cataloged version when fixed.

### CJS-only entrypoints inlined into the SSR ModuleRunner
- reason: Packages without an ESM entry (e.g. `aria-hidden`'s `dist/es5`) get
  inlined into the ModuleRunner when the `node` condition or `main` field wins,
  breaking SSR evaluation. Vue has the same shape: its `node` import resolves
  through `index.mjs` to the CJS `index.js` wrapper.
- affected: dev, build
- patched: `plugins/module-runner-esm/index.ts` resolves the Vue runtime graph
  to its ESM bundler entries. Unlike Nuxt's bundled SSR pipeline, standalone
  Nitro's env-runner inlines these dependencies and cannot delegate Vue's CJS
  wrappers to Node. `vite.config.ts` keeps the general ESM-first SSR policy and
  follows Nuxt's `resolve.dedupe: ['vue']` configuration.
- follow up: Revisit as upstream packages ship native ESM; remove when the
  default `node`/`main` resolution is safe for the SSR ModuleRunner.

### @whatwg-node/fetch resolves to CJS under dispatchFetch
- reason: `@whatwg-node/fetch` (via `graphql-yoga`) exposes a CJS `main`. The
  Vite ModuleRunner evaluates inlined modules without Node `require`/`exports`,
  so the CJS entry throws under `dispatchFetch` even though it works in other
  Node contexts.
- affected: dev, build
- patched: `plugins/module-runner-esm/index.ts` (`moduleRunnerEsmPlugin`) —
  remaps `@whatwg-node/fetch` to its
  `dist/esm-ponyfill.js` build for the `ssr` and `nitro` environments.
- follow up: Remove when `@whatwg-node/fetch` ships a proper ESM entry or the
  ModuleRunner tolerates CJS.

### @vitejs/plugin-vue transforms ?assets queries
- reason: `entry-server.ts` imports page modules with a `?assets` query to
  preload SSR assets. Without an exclusion, `@vitejs/plugin-vue` strips the
  query and tries to parse Nitro's generated asset module as a Vue SFC.
- affected: dev, build
- patched: `vite.config.ts` passes `exclude: /\?assets/` to the Vue plugin. Its
  native transform hook filter sees the full request ID and skips asset queries.
- follow up: Remove once `@vitejs/plugin-vue` handles `?assets` queries
  natively; track the upstream issue.

### Vite DevTools leaves its standalone WebSocket open under Vitest
- reason: Vitest runs Vite in middleware mode without an HTTP server, so
  `@vitejs/devtools` starts a standalone WebSocket server and does not close it.
  Vitest then reaches its 10s shutdown timeout. `vite-plugin-devtools-json` only
  installs middleware and is not part of the problem.
- affected: test
- patched: `vite.config.ts` disables only `DevTools()` when `env.VITEST` is
  truthy; `devtoolsJson()` remains enabled.
- follow up: Upstream fix tracked at https://github.com/vitejs/devtools/pull/519.
  Remove the conditional once that lands and is released.
