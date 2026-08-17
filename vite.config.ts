import { env } from 'node:process'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import DrizzleStudio from './plugins/drizzle-studio/index.ts'
import { graphqlSchemaPlugin } from './plugins/graphql-schema/index.ts'
import { moduleRunnerEsmPlugin } from './plugins/module-runner-esm/index.ts'
import tsconfigPlugin from './plugins/tsconfig/index.ts'

export default defineConfig({
  plugins: [
    moduleRunnerEsmPlugin(),
    tsconfigPlugin(),
    graphqlSchemaPlugin({
      schema: 'server/graphql/schema.ts',
      schemaExport: 'schema',
      outputs: {
        graphql: 'schema.graphql',
        gazania: '.generated/shared/gazania.d.ts',
      },
    }),
    DrizzleStudio(),
    nitro(),
  ],
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
    ssr: {
      // Prefer ESM package fields before Vite's CJS `main` fallback.
      resolve: {
        mainFields: ['module', 'jsnext:main', 'jsnext'],
      },
    },
  },
})
