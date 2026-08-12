import type { Plugin } from 'vite'
import { createRequire } from 'node:module'

/**
 * Remap CJS-only package entrypoints to ESM builds for Vite ModuleRunners.
 *
 * The env-runner evaluates inlined modules without Node `require`/`exports`,
 * so packages whose default `node` condition / `main` field resolves to a
 * CJS wrapper throw when imported inside the runner. Currently remaps the
 * Vue runtime graph to its ESM bundler entries (see the matching entry in
 * `WORKAROUND.md`).
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

  return {
    name: 'module-runner-esm',
    enforce: 'pre',
    applyToEnvironment(environment) {
      return environment.name === 'ssr' || environment.name === 'nitro'
    },
    resolveId(id) {
      if (vueEntries[id])
        return vueEntries[id]
    },
  }
}
