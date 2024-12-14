import type { PluginOptions } from './unplugin'
import { existsSync } from 'node:fs'
import { addComponentsDir, addImportsDir, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'

export interface ModuleOptions extends Omit<PluginOptions, 'dts'> {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'package-name/nuxt',
    configKey: 'package-name',
    version: '>=3.13.1',
  },
  defaults: {
    prefix: 'P',
    importStyle: true,
  },
  setup(options, nuxt) {
    const logger = useLogger('package-name/nuxt')
    const resolver = createResolver(import.meta.url)

    addImportsDir([
      resolver.resolve('composables'),
      resolver.resolve('utils'),
    ])
    addComponentsDir({
      path: resolver.resolve('components'),
      prefix: options.prefix || 'P',
    })

    if (options.importStyle) {
      const possible = [
        resolver.resolve('styles', 'index.css'),
        resolver.resolve('styles', 'index.scss'),
      ]

      const style = possible.find(p => existsSync(p))
      if (style) {
        nuxt.options.css.push(style)
      }
      else {
        logger.warn('No style file found')
      }
    }
  },
})
