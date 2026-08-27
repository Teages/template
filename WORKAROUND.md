# Workaround

Inventory of patches, workarounds, and accepted deviations from upstream or
type-safe conventions. Each entry lists why it exists, which lifecycle stages
it affects, where it is patched, and what would let us remove it.

Stages: `dev` = `pnpm dev` (HMR dev server), `test` = `pnpm test` (automated test
runner), `build` = `pnpm build` + `pnpm preview` (production: build output and
its runtime, with real database).

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
- reason: Some packages expose ESM through `module`/`jsnext:*` fields but CJS
  through `main`. Without an explicit SSR main-field order, Nitro's test
  environment leaves `mainFields` empty and Vite falls back to `main`; for
  example, `aria-hidden` then resolves to `dist/es5` and throws
  `ReferenceError: exports is not defined`. Nitro's env-runner evaluates these
  inlined dependencies without Node's `require`/`exports` globals. Vue's
  `node` import also resolves through `index.mjs` to the CJS `index.js` wrapper.
  `@whatwg-node/fetch` (a `graphql-yoga` dependency) similarly exposes a CJS
  `node-ponyfill.js` entry whose top-level `require('./create-node-ponyfill')`
  fails inside the ModuleRunner.
- affected: dev, test
- patched: `vite.config.ts` sets the SSR `mainFields` to the ESM package fields
  and follows Nuxt's `resolve.dedupe: ['vue']` configuration.
  `plugins/module-runner-esm/index.ts` resolves the Vue runtime graph and
  `@whatwg-node/fetch` to their ESM bundler entries. Unlike Nuxt's bundled SSR
  pipeline, standalone Nitro's env-runner cannot delegate their CJS wrappers
  to Node. The `@whatwg-node/fetch` remap targets `dist/esm-ponyfill.js`.
  The remap plugin is gated to serve mode (`vite dev` + Vitest, not preview):
  during `vite build` it rewrote bare `vue` imports into file paths, which
  inlined a private Vue copy into the SSR service bundle while nft-traced
  dependencies (unhead, pinia-colada, …) kept their own — two Vue runtimes
  whose provide/inject contexts never met, so every production SSR render
  returned 500 (`useHead() was called without provide context`). In builds,
  `vue` must stay a bare specifier so all importers share the single traced
  copy; the production smoke (`pnpm test:smoke`) guards this.
- status: Re-verified against nitro-nightly 3.0.1-20260821 (2026-08-21): both
  the `mainFields` and the two remaps are still required — dropping the
  `@whatwg-node/fetch` remap fails `test/e2e/app/ssr-payload.test.ts` with
  `ReferenceError: require is not defined` on the env-runner loopback path,
  and dropping `mainFields` fails the document e2e suites with
  `ReferenceError: exports is not defined` from `aria-hidden/dist/es5`. The
  API-only `backend` branch could delete the remap only because nothing there
  exercises the env-runner (its e2e suites go through in-process
  `serverFetch`); it also deleted the matching `exportConditions: ['module']`
  from `nitro.config.ts`, which this branch verified as safe to drop without
  either failure reappearing.
- note: Attribution (2026-08-21, from studying unjs/undocs): this class of
  workaround is dependency-borne, not Nitro-borne. undocs pins the same
  nitro-nightly (`3.0.1-20260821-005124-e36e7a60`) and ships none of it —
  its dependency tree is ESM-native (no reka-ui/aria-hidden, no
  graphql-yoga/@whatwg-node CJS chain; the few node/wasm engines are forced
  inline via `noExternals` instead). The durable fix here is also
  dependency-level (preferring ESM-first packages), not config-level.
- follow up: Remove the explicit `mainFields` once Nitro preserves Vite's
  ESM-first server defaults, and revisit the remaps as upstream packages ship
  env-runner-compatible ESM entrypoints.

### Rolldown helper sharing deadlocks production ESM evaluation
- reason: Nitro's Rolldown `codeSplitting.groups` puts each `node_modules`
  package in its own `_libs/*` chunk. Shared runtime helpers
  (`__exportAll`, `__toESM`, `__require`, `__commonJSMin`) then land in an
  app chunk (`_chunks/drizzle.mjs`) because that file also uses
  `import * as schema`. The app chunk imports `@pothos/plugin-drizzle`,
  which imports `@better-auth/drizzle-adapter`, which calls
  `__exportAll` at module top-level from the still-evaluating app chunk.
  Node links the live binding as `undefined`, so the first GraphQL/server
  boot throws `TypeError: __exportAll is not a function`. Dev and
  in-process e2e never hit this: they run through Vite's ModuleRunner, not
  the split production graph.
- affected: build
- patched: `nitro.config.ts` sets `inlineDynamicImports: true`, which Nitro
  turns into Rolldown `codeSplitting: false` so helpers stay local to the
  single server file. `test/smoke/server-eval.test.ts` boots
  `.output/server/index.mjs` without Postgres and asserts the process
  answers `/api/health`.
- follow up: Remove once Rolldown places shared helpers in a leaf chunk
  that participates in no import cycle, or Nitro stops grouping
  `node_modules` in a way that re-exports drizzle-orm through Pothos and
  Better Auth adapter chunks. Track rolldown and nitro releases.

  Note: this entry supersedes the former "Nitro trace omits tslib" fix
  (`traceDeps: ['tslib*']`). Inlining the server bundle also bundles the
  `graphql-yoga` CJS chain — Rolldown rewrites its `require("tslib")` — so
  no traced copy needs a transitive `tslib` follow anymore. The
  `plugins/module-runner-esm` remap above is unaffected: it fixes the
  *dev/test* ModuleRunner path, and history says do not remove it again
  based on "prod is fine" (see the note under that entry).

### @vitejs/plugin-vue transforms ?assets queries
- reason: `plugins/vue-ssr/runtime/app/entry-server.ts` imports page modules
  with a `?assets` query to
  preload SSR assets. Without an exclusion, `@vitejs/plugin-vue` strips the
  query and tries to parse Nitro's generated asset module as a Vue SFC.
- affected: dev, build
- patched: `plugins/vue-ssr/index.ts` passes `exclude: /\?assets/` to the Vue
  plugin. Its native transform hook filter sees the full request ID and skips
  asset queries.
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
