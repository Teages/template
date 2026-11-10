import type { NitroModule } from 'nitro/types'
import NitroDrizzle from '@teages/nitro-drizzle'
import { defineConfig } from 'nitro/config'

// Vite 8.3 externalizes `node_modules/.pnpm` file URLs and then fails to load
// them, including `@teages/nitro-drizzle`'s `#drizzle` imports. Bundle
// dependencies instead. Declared here so the Drizzle module keeps the pattern
// when it copies `noExternals`. See WORKAROUND.md.
const bundleNodeModules = /node_modules\//

const bundleNitroDeps: NitroModule = {
  name: 'bundle-nitro-deps',
  setup(nitro) {
    if (nitro.options.noExternals === true)
      return
    const patterns = Array.isArray(nitro.options.noExternals)
      ? nitro.options.noExternals
      : []
    if (!patterns.includes(bundleNodeModules))
      nitro.options.noExternals = [...patterns, bundleNodeModules]
  },
}

export default defineConfig({
  serverDir: './server',
  modules: [NitroDrizzle, bundleNitroDeps],
  noExternals: [bundleNodeModules],
  // Rolldown otherwise shares runtime helpers from an app chunk that lib
  // chunks import, which deadlocks ESM evaluation (see WORKAROUND.md).
  inlineDynamicImports: true,
  experimental: {
    tasks: true,
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
