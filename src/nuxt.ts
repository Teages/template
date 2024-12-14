import type { PluginOptions } from './unplugin'
import { fileURLToPath } from 'node:url'
import { addComponentsDir, addImportsDir, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'

const __filename = fileURLToPath(import.meta.url)
const isDist = !!__filename.endsWith('.ts')

export interface ModuleOptions extends Pick<
  PluginOptions,
  | 'prefix'
  | 'importStyle'
> {}

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
      const style = isDist
        ? resolver.resolve('styles', 'index.css')
        : resolver.resolve('styles', 'index.scss')

      nuxt.options.css.push(style)
    }
  },
})
