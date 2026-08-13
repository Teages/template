import { env } from 'node:process'
import ui from '@nuxt/ui/vite'
import vue from '@vitejs/plugin-vue'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import devToolsPlugin from './plugins/dev-tools/index.ts'
import DrizzleStudio from './plugins/drizzle-studio/index.ts'
import { graphqlSchemaPlugin } from './plugins/graphql-schema/index.ts'
import { moduleRunnerEsmPlugin } from './plugins/module-runner-esm/index.ts'
import tsconfigPlugin from './plugins/tsconfig/index.ts'
import { vueRouterPlugin } from './plugins/vue-router/index.ts'

export default defineConfig({
  plugins: [
    moduleRunnerEsmPlugin(),
    tsconfigPlugin(),
    vueRouterPlugin({
      routesFolder: 'app/pages',
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
    devToolsPlugin(),
    DrizzleStudio(),
    nitro(),
  ],
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
      build: { rollupOptions: { input: './app/entry-server.ts' } },

      // Prefer ESM package fields before Vite's CJS `main` fallback.
      resolve: {
        mainFields: ['module', 'jsnext:main', 'jsnext'],
      },
    },
  },
})
