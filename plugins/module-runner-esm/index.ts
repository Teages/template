import type { Plugin } from 'vite'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Remap CJS-only package entrypoints to ESM builds for Vite ModuleRunners.
 *
 * The env-runner evaluates inlined modules without Node `require`/`exports`,
 * so packages that resolve to CJS (`main`) throw under `dispatchFetch` even
 * when the same import works in other Node contexts.
 */
export function moduleRunnerEsmPlugin(): Plugin {
  const fromYoga = createRequire(require.resolve('graphql-yoga/package.json'))
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
      if (id === '@whatwg-node/fetch')
        return whatwgFetchEsm
    },
  }
}
