import type { HookHandler, Plugin } from 'vite'
import { env } from 'node:process'
import ui from '@nuxt/ui/vite'
import { DevTools } from '@vitejs/devtools'
import vue from '@vitejs/plugin-vue'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'
import VueRouter from 'vue-router/vite'
import DrizzleStudio from './plugins/drizzle-studio/index.ts'
import { graphqlSchemaPlugin } from './plugins/graphql-schema/index.ts'
import { moduleRunnerEsmPlugin } from './plugins/module-runner-esm/index.ts'
import { vueEsmSsrPlugin } from './plugins/vue-esm-ssr/index.ts'

export default defineConfig({
  plugins: [
    vueEsmSsrPlugin(),
    moduleRunnerEsmPlugin(),
    // VueRouter must be added BEFORE vue() per the official docs.
    VueRouter({
      routesFolder: 'app/pages',
      dts: '.generated/app/typed-router.d.ts',
      // Stash page file path on meta so entry-server can find its ?assets importer.
      extendRoute(route) {
        const file = route.component
        if (file) {
          route.addToMeta({ __filePath: file })
        }
      },
    }),
    patchVueExclude(vue(), /\?assets/),
    ui({
      autoImport: {
        imports: ['vue', 'vue-router'],
        dirs: ['app/composables', 'app/utils'],
        dts: '.generated/app/auto-imports.d.ts',
      },
      components: {
        dirs: ['app/components'],
        dts: '.generated/app/components.d.ts',
      },
    }),
    graphqlSchemaPlugin({
      schema: 'server/graphql/schema.ts',
      schemaExport: 'schema',
      outputs: {
        graphql: 'schema.graphql',
        gazania: '.generated/shared/gazania.d.ts',
      },
    }),
    // Embedded mode: HTML is rendered by Nitro/SSR, so client inject lives in entry-client.
    // DevTools / devtoolsJson open a 127.0.0.1:7812 server with no close hook —
    // skip under Vitest so the process can exit within the 10s close timeout.
    // Upstream fix tracked in https://github.com/vitejs/devtools/pull/519
    ...(env.VITEST ? [] : [DevTools(), devtoolsJson()] as Plugin[]),
    DrizzleStudio(),
    nitro(),
  ],
  build: {
    rolldownOptions: {
      // Enable Rolldown analysis panels for `vite build` / standalone DevTools.
      devtools: {},
    },
  },
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },
  define: {
    'import.meta.vitest': 'undefined',
    'import.meta.MOCK_DATABASE': env.MOCK_DATABASE || 'undefined',
  },
  environments: {
    client: { build: { rollupOptions: { input: './app/entry-client.ts' } } },
    ssr: {
      // Avoid the `node` export condition so `vue` resolves to the ESM bundler
      // build instead of `index.mjs` → CJS (`module is not defined` in the runner).
      // Prefer `module`/`jsnext` over `main` so CJS-only entrypoints (e.g.
      // aria-hidden's dist/es5) are not inlined into the ModuleRunner.
      resolve: {
        conditions: ['import', 'module', 'default'],
        mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
      },
      build: {
        rollupOptions: {
          input: './app/entry-server.ts',
          output: { codeSplitting: false },
        },
      },
    },
  },
})

type TransformHook = HookHandler<NonNullable<Plugin['transform']>>

function patchVueExclude(plugin: Plugin, exclude: RegExp): Plugin {
  const transform = plugin.transform
  if (!transform)
    return plugin

  const wrap = (original: TransformHook): TransformHook =>
    function (this: ThisParameterType<TransformHook>, ...args: Parameters<TransformHook>) {
      if (exclude.test(args[1]))
        return
      return original.call(this, ...args)
    }

  if (typeof transform === 'function')
    plugin.transform = wrap(transform)
  else
    transform.handler = wrap(transform.handler)

  return plugin
}
