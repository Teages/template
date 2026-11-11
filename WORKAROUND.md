# Workaround

Inventory of patches, workarounds, and accepted deviations from upstream or
type-safe conventions. Each entry lists why it exists, which lifecycle stages
it affects, where it is patched, and what would let us remove it.

Stages: `dev` = `pnpm dev` (HMR dev server), `test` = `pnpm test` (automated test
runner), `build` = `pnpm build` + `pnpm preview` (production: build output and
its runtime, with real database).

---

## Problems and workarounds

### Vite 8.3 Nitro dev runner cannot load externalized pnpm file URLs
- reason: With Vite 8.3 and Nitro `3.0.261103-rc`, the dev/test module runner
  externalizes dependencies to `file://` URLs under `node_modules/.pnpm` and
  then fails to load them. `@teages/nitro-drizzle@0.4.5` keeps its own runtime
  in the server graph by anchoring `noExternals` on the resolved directory;
  nested packages such as `drizzle-orm/pglite` and `graphql-yoga` still fail.
- affected: dev, test
- patched: `nitro.config.ts` sets `noExternals` to `/node_modules\//`. The
  Drizzle module copies that list and appends its own runtime pattern.
- follow up: Remove once the Nitro dev runner can import externalized pnpm
  file URLs.

---

## Resolved

Kept for context; the patch is gone and the regression guard stays.

### Rolldown helper sharing deadlocked production ESM evaluation (removed 2026-11-11)
- reason: Nitro's Rolldown `codeSplitting.groups` puts each `node_modules`
  package in its own `_libs/*` chunk. Shared runtime helpers
  (`__exportAll`, `__toESM`, `__require`, `__commonJSMin`) then landed in an
  app chunk (`_chunks/drizzle.mjs`) because that file also uses
  `import * as schema`. The app chunk imports `@pothos/plugin-drizzle`,
  which imports `@better-auth/drizzle-adapter`, which calls
  `__exportAll` at module top-level from the still-evaluating app chunk.
  Node links the live binding as `undefined`, so the first GraphQL/server
  boot threw `TypeError: __exportAll is not a function`. Dev and
  in-process e2e never hit this: they run through Vite's ModuleRunner, not
  the split production graph.
- affected: build
- was patched: `nitro.config.ts` set `inlineDynamicImports: true`, which
  Nitro turns into Rolldown `codeSplitting: false` so helpers stayed local
  to the single server file.
- removed because: rolldown#11293 ("only host the runtime in a chunk that
  every consumer's entries load", merged 2026-10-28, released in rolldown
  1.2.16) fixes the class. Verified on rolldown 1.2.18: without the flag the
  helpers land in the leaf `_runtime.mjs` chunk, `pnpm build` + the full
  smoke suite pass, and the bundled server answers both `/api/health` and a
  GraphQL query. Upstream reports: rolldown#8184, #11341, #11351, #10747.
- guard: `test/smoke/server-eval.test.ts` still boots
  `.output/server/index.mjs` without Postgres and asserts the process
  answers `/api/health`, so a regression in helper placement fails CI.
