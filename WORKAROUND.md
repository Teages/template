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
  environment leaves `mainFields` empty and Vite falls back to `main`.
  `@whatwg-node/fetch` (a `graphql-yoga` dependency) exposes a CJS
  `node-ponyfill.js` entry whose top-level `require('./create-node-ponyfill')`
  fails inside the ModuleRunner — Nitro's env-runner evaluates inlined
  dependencies without Node's `require`/`exports` globals.
- affected: dev, test
- patched: `vite.config.ts` sets the SSR `mainFields` to the ESM package
  fields. `plugins/module-runner-esm/index.ts` resolves `@whatwg-node/fetch`
  to its ESM `dist/esm-ponyfill.js` entry — unlike Nuxt's bundled SSR
  pipeline, standalone Nitro's env-runner cannot delegate the CJS wrapper to
  Node. The remap plugin is gated to serve mode (`vite dev` + Vitest, not
  preview): during `vite build` the specifier must stay bare so nft tracing
  keeps copying the real package and Node's native ESM/CJS interop handles it
  in production; the production smoke (`pnpm test:smoke`) guards this.
- follow up: Remove the explicit `mainFields` once Nitro preserves Vite's
  ESM-first server defaults, and drop the remap when upstream ships an
  env-runner-compatible ESM entrypoint.

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
