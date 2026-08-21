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
