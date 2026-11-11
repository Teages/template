import NitroDrizzle from '@teages/nitro-drizzle'
import { defineConfig } from 'nitro/config'

export default defineConfig({
  serverDir: './server',
  modules: [NitroDrizzle],
  // Vite 8.3 still fails to load externalized pnpm `file://` URLs. 0.4.5
  // anchors its own runtime on the resolved path and copies this list.
  noExternals: [/node_modules\//],
  experimental: {
    asyncContext: true,
    envExpansion: true,
  },
  drizzle: {
    dialect: 'postgresql',
    driver: 'postgres-js',
    schemaPath: './server/database/index.ts',
    migrationsDir: './server/database/migrations',
    devMock: true,
    // No credentials live in this file: `{{NITRO_DRIZZLE_CONNECTION_*}}`
    // templates expand at runtime from the environment (enabled by
    // experimental.envExpansion above) — the same names compose.yaml,
    // .env.example, and drizzle-kit (via drizzle.config.ts) provide. Never
    // a concatenated URI; missing variables keep their literal template.
    connection: {
      host: '{{NITRO_DRIZZLE_CONNECTION_HOST}}',
      port: '{{NITRO_DRIZZLE_CONNECTION_PORT}}',
      user: '{{NITRO_DRIZZLE_CONNECTION_USER}}',
      password: '{{NITRO_DRIZZLE_CONNECTION_PASSWORD}}',
      database: '{{NITRO_DRIZZLE_CONNECTION_DATABASE}}',
    },
  },
})
