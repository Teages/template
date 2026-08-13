import type { VuePlugin } from './vue-plugin.ts'
import { collectVuePlugins } from './vue-plugin.ts'

export const serverVuePluginModules = import.meta.glob<VuePlugin>(
  [
    '/app/plugins/*.ts',
    '!/app/plugins/*.client.ts',
  ],
  {
    eager: true,
    import: 'default',
  },
)

export const serverVuePlugins = collectVuePlugins(serverVuePluginModules)
