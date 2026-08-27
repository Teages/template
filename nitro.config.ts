import NitroDrizzle from '@teages/nitro-drizzle'
import { defineConfig } from 'nitro/config'

export default defineConfig({
  serverDir: './server',
  modules: [NitroDrizzle],
  // Rolldown otherwise shares runtime helpers from an app chunk that lib
  // chunks import, which deadlocks ESM evaluation (see WORKAROUND.md).
  inlineDynamicImports: true,
  experimental: {
    asyncContext: true,
    envExpansion: true,
  },
  drizzle: {
    dialect: 'postgresql',
    driver: 'postgres-js',
    schemaPath: './server/database/index.ts',
    migrationsDir: './server/database/migrations',
    dev: true,
    // No credentials live in this file: `{{NITRO_DRIZZLE_CONNECTION_*}}`
    // templates expand at runtime from the environment (enabled by
    // experimental.envExpansion above) — the same names compose.yaml,
    // .env.example, and drizzle-kit (via drizzle.config.ts) provide. Never
    // a concatenated URI; missing variables keep their literal template.
    // `port` stays a static default because the module types it as number
    // (no template strings) — NITRO_DRIZZLE_CONNECTION_PORT overrides it
    // through the regular env-override channel instead.
    connection: {
      host: '{{NITRO_DRIZZLE_CONNECTION_HOST}}',
      port: 5433,
      user: '{{NITRO_DRIZZLE_CONNECTION_USER}}',
      password: '{{NITRO_DRIZZLE_CONNECTION_PASSWORD}}',
      database: '{{NITRO_DRIZZLE_CONNECTION_DATABASE}}',
    },
  },
})
