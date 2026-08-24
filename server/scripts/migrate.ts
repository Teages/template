import { resolve } from 'node:path'
import { env } from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { logger } from '../utils/logger'

// Bundled to .output/server/migrate.mjs by vite.config.migrate.ts. The SQL
// migrations are copied to .output/server/db/migrations by @teages/nitro-drizzle
// on compile, so a slim node image can run this without pnpm or dev
// dependencies.
const db = drizzle({
  connection: {
    host: env.NITRO_DRIZZLE_CONNECTION_HOST || 'localhost',
    port: Number(env.NITRO_DRIZZLE_CONNECTION_PORT) || 5433,
    user: env.NITRO_DRIZZLE_CONNECTION_USER || 'user',
    password: env.NITRO_DRIZZLE_CONNECTION_PASSWORD ?? 'passwd',
    database: env.NITRO_DRIZZLE_CONNECTION_DATABASE || 'mydb',
  },
})
try {
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, 'db/migrations') })
}
finally {
  await db.$client.end()
}
logger.success('Migrations applied')
