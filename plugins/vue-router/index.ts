import type { Plugin } from 'vite'
import VueRouter from 'vue-router/vite'

type Options = Parameters<typeof VueRouter>[0] & {}

export function vueRouterPlugin(options?: Options): Plugin<any> | Plugin<any>[] {
  const raw = VueRouter({
    ...options,
    dts: '.generated/app/typed-router.d.ts',
    // Stash page file path on meta so entry-server can find its ?assets importer.
    extendRoute(route) {
      options?.extendRoute?.(route)

      const file = route.component
      if (file) {
        route.addToMeta({ __filePath: file })
      }
    },
  })

  return [
    ...(Array.isArray(raw) ? raw : [raw]),
    {
      name: 'internal:vue-router-types',
      nitro: {
        setup(nitro) {
          nitro.hooks.hook('prepare:types', ({ app }) => {
            app.vueCompilerOptions ??= {}
            app.vueCompilerOptions.plugins ??= []
            app.vueCompilerOptions.plugins.push('vue-router/volar/sfc-route-blocks')
            app.vueCompilerOptions.plugins.push('vue-router/volar/sfc-typed-router')
          })
        },
      },
    },
  ]
}
