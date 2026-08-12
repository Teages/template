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
import tsconfigPlugin from './plugins/tsconfig/index.ts'

export default defineConfig({
  plugins: [
    moduleRunnerEsmPlugin(),
    tsconfigPlugin(),
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
    vue({ exclude: /\?assets/ }),
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
    // DevTools opens a standalone WebSocket without a close hook in Vitest's
    // middleware mode, so skip it to avoid the 10s close timeout.
    // Upstream fix tracked in https://github.com/vitejs/devtools/pull/519
    env.VITEST ? false : DevTools(),
    devtoolsJson(),
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
    dedupe: ['vue'],
  },
  define: {
    'import.meta.vitest': 'undefined',
    'import.meta.MOCK_DATABASE': env.MOCK_DATABASE || 'undefined',
  },
  environments: {
    client: { build: { rollupOptions: { input: './app/entry-client.ts' } } },
    ssr: {
      // Prefer ESM entrypoints for packages that Nitro's ModuleRunner inlines.
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
