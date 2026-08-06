import type { Plugin } from 'vite'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Force Vue packages to ESM bundler builds in the SSR module runner.
 * Vue's `node` export resolves to CJS (`index.mjs` → `index.js`), which throws
 * `module is not defined` under Vite's ESModulesEvaluator.
 */
export function vueEsmSsrPlugin(): Plugin {
  const vueRuntime = require.resolve('vue/dist/vue.runtime.esm-bundler.js')
  const runtimeDom = require.resolve('@vue/runtime-dom/dist/runtime-dom.esm-bundler.js')
  const runtimeCore = require.resolve('@vue/runtime-core/dist/runtime-core.esm-bundler.js')
  const reactivity = require.resolve('@vue/reactivity/dist/reactivity.esm-bundler.js')
  const shared = require.resolve('@vue/shared/dist/shared.esm-bundler.js')
  const serverRenderer = require.resolve('@vue/server-renderer/dist/server-renderer.esm-bundler.js')

  const map: Record<string, string> = {
    'vue': vueRuntime,
    '@vue/runtime-dom': runtimeDom,
    '@vue/runtime-core': runtimeCore,
    '@vue/reactivity': reactivity,
    '@vue/shared': shared,
    '@vue/server-renderer': serverRenderer,
    'vue/server-renderer': serverRenderer,
  }

  return {
    name: 'vue-esm-ssr',
    enforce: 'pre',
    applyToEnvironment(environment) {
      return environment.name === 'ssr'
    },
    resolveId(id) {
      return map[id]
    },
  }
}
