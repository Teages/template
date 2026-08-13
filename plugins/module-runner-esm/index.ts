import type { Plugin } from 'vite'
import { createRequire } from 'node:module'

/**
 * Remap CJS-only package entrypoints to ESM builds for Vite ModuleRunners.
 *
 * The env-runner evaluates inlined modules without Node `require`/`exports`,
 * so packages whose default `node` condition / `main` field resolves to a
 * CJS wrapper throw when imported inside the runner. Currently remaps the
 * Vue runtime graph and `@whatwg-node/fetch` to their ESM bundler entries
 * (see the matching entries in `WORKAROUND.md`).
 *
 * `@whatwg-node/fetch` specifically ships a CJS `node-ponyfill.js` whose
 * top-level `require('./create-node-ponyfill')` throws inside the dev/test
 * ModuleRunner. Its ESM `esm-ponyfill.js` entry avoids this and is what the
 * Vite SSR/nitro environments import. This remap does NOT touch the bundled
 * production server: Nitro's nft trace copies the real package and Node's
 * native ESM/CJS interop handles it there (the prod tslib crash is covered
 * separately by `traceDeps` in `nitro.config.ts`). Do not remove this remap
 * based on "prod is fine" — that was the regression in the commit that
 * dropped it, which surfaced as `ReferenceError: require is not defined`.
 */
export function moduleRunnerEsmPlugin(): Plugin {
  const fromVue = createRequire(import.meta.resolve('vue/package.json'))
  const vueEntries: Record<string, string> = {
    'vue': fromVue.resolve('vue/dist/vue.runtime.esm-bundler.js'),
    '@vue/runtime-dom': fromVue.resolve('@vue/runtime-dom/dist/runtime-dom.esm-bundler.js'),
    '@vue/runtime-core': fromVue.resolve('@vue/runtime-core/dist/runtime-core.esm-bundler.js'),
    '@vue/reactivity': fromVue.resolve('@vue/reactivity/dist/reactivity.esm-bundler.js'),
    '@vue/shared': fromVue.resolve('@vue/shared/dist/shared.esm-bundler.js'),
    '@vue/server-renderer': fromVue.resolve('@vue/server-renderer/dist/server-renderer.esm-bundler.js'),
    'vue/server-renderer': fromVue.resolve('@vue/server-renderer/dist/server-renderer.esm-bundler.js'),
  }
  const fromYoga = createRequire(import.meta.resolve('graphql-yoga/package.json'))
  const whatwgFetchEsm = fromYoga.resolve(
    '@whatwg-node/fetch/dist/esm-ponyfill.js',
  )

  return {
    name: 'module-runner-esm',
    enforce: 'pre',
    applyToEnvironment(environment) {
      return environment.name === 'ssr' || environment.name === 'nitro'
    },
    resolveId(id) {
      if (vueEntries[id])
        return vueEntries[id]
      if (id === '@whatwg-node/fetch')
        return whatwgFetchEsm
    },
  }
}
