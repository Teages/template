import type { Plugin } from 'vite'
import { createRequire } from 'node:module'

/**
 * Remap CJS-only package entrypoints to ESM builds for Vite ModuleRunners.
 *
 * The env-runner evaluates inlined modules without Node `require`/`exports`,
 * so packages whose default `node` condition / `main` field resolves to a
 * CJS wrapper throw when imported inside the runner. Currently remaps
 * `@whatwg-node/fetch` (a `graphql-yoga` dependency) to its ESM bundler
 * entry (see the matching entry in `WORKAROUND.md`).
 *
 * `@whatwg-node/fetch` specifically ships a CJS `node-ponyfill.js` whose
 * top-level `require('./create-node-ponyfill')` throws inside the dev/test
 * ModuleRunner. Its ESM `esm-ponyfill.js` entry avoids this and is what the
 * Vite SSR/nitro environments import. The remap is gated to serve mode
 * (`vite dev` + Vitest): in `vite build` it would rewrite the bare specifier
 * into a file path and inline the package into the bundle, while Nitro's nft
 * trace should keep copying the real package (the prod tslib crash is covered
 * separately by `traceDeps` in `nitro.config.ts`). Do not remove this remap
 * based on "prod is fine" — that was the regression in the commit that
 * dropped it, which surfaced as `ReferenceError: require is not defined`.
 */
export function moduleRunnerEsmPlugin(): Plugin {
  const fromYoga = createRequire(import.meta.resolve('graphql-yoga/package.json'))
  const whatwgFetchEsm = fromYoga.resolve(
    '@whatwg-node/fetch/dist/esm-ponyfill.js',
  )

  return {
    name: 'module-runner-esm',
    enforce: 'pre',
    // Serve mode only (dev + Vitest): during `vite build` the specifier must
    // stay bare so nft tracing and Node's native ESM/CJS interop handle the
    // real package in production.
    apply: (_config, { command, isPreview }) =>
      command === 'serve' && !isPreview,
    applyToEnvironment(environment) {
      return environment.name === 'ssr' || environment.name === 'nitro'
    },
    resolveId(id) {
      if (id === '@whatwg-node/fetch')
        return whatwgFetchEsm
    },
  }
}
