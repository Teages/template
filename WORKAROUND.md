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
- follow up: Remove the explicit `mainFields` once Nitro preserves Vite's
  ESM-first server defaults, and revisit the remaps as upstream packages ship
  env-runner-compatible ESM entrypoints.

### Nitro trace omits tslib, crashing graphql-yoga in production
- reason: `graphql-yoga` and its `@whatwg-node/*` chain (`node-fetch`,
  `disposablestack`, …) ship as TypeScript-compiled CJS that
  `require("tslib")` for tsc's `__importStar`/`__exportStar` helpers. Nitro's
  nft trace copies those packages into `.output/server/node_modules/` but does
  not follow the transitive `tslib` dependency, so at runtime the first
  request to `/api/graphql` throws
  `Cannot find module '.../node_modules/tslib/tslib.js'` and returns 500.
  Only the bundled production server is affected: `dev` pre-bundles deps via
  Vite, and `test` runs Nitro in-process, so neither hits the trace output.
- affected: build
- patched: `nitro.config.ts` `traceDeps` includes `'tslib*'`, expanding the
  nft allowlist so `tslib` is bundled alongside `graphql-yoga*` and the rest.
- follow up: Remove once Nitro's nft tracer follows transitive runtime deps
  like `tslib` automatically. Track the Nitro release that fixes it.

  Note: an earlier commit (the one introducing this `traceDeps` fix) blamed
  `@whatwg-node/fetch`'s CJS `main` as a *prod* problem, dropped the
  `dist/esm-ponyfill.js` remap from `plugins/module-runner-esm/index.ts`, and
  rewrote the WORKAROUND to call it a misdiagnosis. That was itself the
  misdiagnosis: the prod path is fine and was fixed by `traceDeps`, but the
  remap also fixes the *dev/test* ModuleRunner path where
  `ReferenceError: require is not defined` reappeared after the remap was
  dropped (once nitro 3.0.260606-beta stopped masking it via SSR-warmup
  timeouts). Both fixes are needed — the remap for dev/test, `traceDeps` for
  prod. Do not remove the remap again based on "prod is fine".

### Bundling PGlite into a rollup chunk drops its sidecar assets
- reason: `@electric-sql/pglite` loads runtime assets (`pglite.data` FS
  image, extension tarballs, wasm) via reads relative to its module file.
  Nitro's vite build inlines the package into a `_libs/*.mjs` chunk, and
  rollup emits none of the sidecars — a `MOCK_DATABASE=true` production
  build boots and then fails every DB-touching request with
  `ENOENT .../_libs/pglite.data`.
- affected: build (MOCK flavor only — used by the PGlite smoke in
  `test/smoke/preview.test.ts`; real builds never execute the PGlite path)
- patched: `nitro.config.ts` adds `'@electric-sql/pglite*'` to `traceDeps`
  when `MOCK_DATABASE` is set — the `*` suffix externalizes and full-traces
  the package so it lands in `.output*/server/node_modules` with all
  sidecars, matching the dev/test context. The mock artifact also resolves
  `drizzle-kit` (schema push) from the repo's `node_modules` at runtime, so
  it must run from within the repository.
- follow up: Revisit if Nitro learns to emit fs-referenced package assets
  for bundled dependencies.

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
