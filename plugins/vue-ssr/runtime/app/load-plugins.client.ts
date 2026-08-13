import type { VuePlugin } from './vue-plugin.ts'
import { collectVuePlugins } from './vue-plugin.ts'

export const clientVuePluginModules = import.meta.glob<VuePlugin>(
  [
    '/app/plugins/*.ts',
    '!/app/plugins/*.server.ts',
  ],
  {
    eager: true,
    import: 'default',
  },
)

export const clientVuePlugins = collectVuePlugins(clientVuePluginModules)
