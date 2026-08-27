import { env } from 'node:process'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { graphqlSchemaPlugin } from './plugins/graphql-schema/index.ts'
import tsconfigPlugin from './plugins/tsconfig/index.ts'

export default defineConfig({
  plugins: [
    tsconfigPlugin(),
    graphqlSchemaPlugin({
      schema: 'server/graphql/schema.ts',
      schemaExport: 'schema',
      outputs: {
        graphql: 'schema.graphql',
        gazania: '.generated/shared/gazania.d.ts',
      },
    }),
    // Drizzle Studio ships built into @teages/nitro-drizzle dev-database
    // sessions (drizzle.dev) — no local plugin needed.
    nitro(),
  ],
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },
  define: {
    'import.meta.vitest': 'undefined',
    'import.meta.env.NITRO_DRIZZLE_DEV': env.NITRO_DRIZZLE_DEV === 'false'
      ? 'false'
      : 'undefined',
  },
})
