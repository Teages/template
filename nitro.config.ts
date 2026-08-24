import NitroDrizzle from '@teages/nitro-drizzle'
import { defineConfig } from 'nitro/config'

const drizzle = {
  dialect: 'postgresql',
  driver: 'postgres-js',
  schemaPath: './server/database/index.ts',
  migrationsDir: './server/database/migrations',
  dev: true,
} as const

export default defineConfig({
  serverDir: './server',
  modules: [NitroDrizzle],
  // Rolldown otherwise shares runtime helpers from an app chunk that lib
  // chunks import, which deadlocks ESM evaluation (see WORKAROUND.md).
  inlineDynamicImports: true,
  experimental: {
    tasks: true,
    asyncContext: true,
  },
  drizzle,
  runtimeConfig: {
    // The module rewrites runtimeConfig.drizzle at setup with the resolved
    // runtime shape (dialect, driver, migrationsDir, dev, and a connection
    // with every key present), so the generated runtime-config types require
    // that full shape here. Keys other than the Postgres credentials below
    // are module-managed and only spelled out to satisfy the types.
    drizzle: {
      ...drizzle,
      connection: {
        host: 'localhost',
        port: 5433,
        user: 'user',
        password: 'passwd',
        database: 'mydb',
        url: '',
        uri: '',
        authToken: '',
        connectionString: '',
        accountId: '',
        apiToken: '',
        databaseId: '',
        hyperdriveId: '',
        dataDir: '',
      },
    },
  },
})
