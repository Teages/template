import { env } from 'node:process'
import ui from '@nuxt/ui/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { autoImportPlugin } from './plugins/auto-import/index.ts'
import devToolsPlugin from './plugins/dev-tools/index.ts'
import DrizzleStudio from './plugins/drizzle-studio/index.ts'
import { graphqlSchemaPlugin } from './plugins/graphql-schema/index.ts'
import { moduleRunnerEsmPlugin } from './plugins/module-runner-esm/index.ts'
import tsconfigPlugin from './plugins/tsconfig/index.ts'
import { vueRouterPlugin } from './plugins/vue-router/index.ts'
import { vueSsrPlugin } from './plugins/vue-ssr/index.ts'

export default defineConfig({
  plugins: [
    moduleRunnerEsmPlugin(),
    tsconfigPlugin(),
    vueRouterPlugin({
      routesFolder: 'app/pages',
    }),
    vueSsrPlugin(),
    ui({
      // Auto-imports are owned by plugins/auto-import; only the component
      // resolver stays with @nuxt/ui (see plugins/auto-import/index.ts).
      autoImport: false,
      components: {
        dirs: ['app/components'],
        dts: '.generated/app/components.d.ts',
      },
    }),
    autoImportPlugin(),
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
    ssr: {
      // Prefer ESM package fields before Vite's CJS `main` fallback.
      resolve: {
        mainFields: ['module', 'jsnext:main', 'jsnext'],
      },
    },
  },
})
