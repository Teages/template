import type { Options } from 'unplugin-auto-import/types'
import type { PluginOption } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'

/**
 * App-side auto-import configuration, owned here instead of `@nuxt/ui`.
 *
 * `@nuxt/ui`'s `autoImport` option is additive-only (defu merges its own
 * runtime composables and `dts` default behind whatever is configured), so
 * taking it back means disabling it there (`autoImport: false`) and
 * registering this plugin directly. Only auto-import moved out: `U*`
 * component resolution stays inside `@nuxt/ui`'s `unplugin-vue-components`
 * instance, where the resolver chain (router-mode overrides, color-mode
 * filtering, prefix conventions) is upstream-owned and tested.
 */
export function getAutoImportOptions(): Options {
  return {
    imports: [
      'vue',
      'vue-router',
      { '@unhead/vue': ['useHead'] },
    ],
    dirs: [
      'app/composables',
      'app/utils',
      // Nuxt-style module runtime contributions: plugin code can expose app
      // composables and utils by placing files in these opt-in directories.
      // Globs with a file extension are used literally (top-level files
      // only); plain directory names above scan recursively.
      'plugins/*/runtime/app/composables/*.ts',
      'plugins/*/runtime/app/utils/*.ts',
    ],
    // `.generated/tsconfig.app.json` picks the dts up via its `./app/**/*.ts`
    // include — keep the path under `.generated/app/` or update the tsconfig
    // plugin together with any move.
    dts: '.generated/app/auto-imports.d.ts',
  }
}

export function autoImportPlugin(): PluginOption[] {
  return [AutoImport(getAutoImportOptions())]
}
