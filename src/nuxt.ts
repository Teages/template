import type { PluginOptions } from './unplugin'
import { fileURLToPath } from 'node:url'
import { addComponentsDir, addImportsSources, createResolver, defineNuxtModule } from '@nuxt/kit'
import defu from 'defu'
import { unimportPreset } from './unplugin'

const __filename = fileURLToPath(import.meta.url)
const isDist = !__filename.endsWith('.ts')

export interface ModuleOptions extends Pick<
  PluginOptions,
  | 'prefix'
  | 'importStyle'
> {}
const defaultOptions: Required<ModuleOptions> = {
  prefix: 'P',
  importStyle: true,
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'package-name/nuxt',
    configKey: 'package-name',
    version: '>=4.0.0',
  },
  defaults: {},
  setup(_options, nuxt) {
    const options = defu(_options, defaultOptions)
    const resolver = createResolver(import.meta.url)

    addImportsSources(unimportPreset)
    addComponentsDir({
      path: resolver.resolve('components'),
      prefix: options.prefix,
    })

    if (options.importStyle) {
      const style = isDist
        ? resolver.resolve('styles', 'index.css')
        : resolver.resolve('styles', 'index.scss')

      nuxt.options.css.push(style)
    }
  },
})
