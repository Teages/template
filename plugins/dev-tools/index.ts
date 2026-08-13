import type { PluginOption } from 'vite'
import { env } from 'node:process'
import { DevTools } from '@vitejs/devtools'
import devtoolsJson from 'vite-plugin-devtools-json'

export default function devToolsPlugin(): PluginOption {
  const plugins: PluginOption[] = [{
    name: 'internal:devtools',
    config() {
      return {
        build: {
          rolldownOptions: {
            // Enable Rolldown analysis panels for `vite build` / standalone DevTools.
            devtools: {},
          },
        },
      }
    },
  }]

  // Embedded mode: HTML is rendered by Nitro/SSR, so app/plugins owns client inject.
  // DevTools opens a standalone WebSocket without a close hook in Vitest's
  // middleware mode, so skip it to avoid the 10s close timeout.
  // Upstream fix tracked in https://github.com/vitejs/devtools/pull/519
  if (!env.VITEST) {
    plugins.push(DevTools())
  }
  plugins.push(devtoolsJson())

  return plugins
}
