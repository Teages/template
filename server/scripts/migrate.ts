import { resolve } from 'node:path'
import { env } from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { logger } from '../utils/logger'

// Bundled to .output/server/migrate.mjs by vite.config.migrate.ts, which
// also copies the SQL migrations to .output/server/db/migrations, so a slim
// node image can run this without pnpm or dev dependencies.
const CONNECTION_KEYS = [
  'NITRO_DRIZZLE_CONNECTION_HOST',
  'NITRO_DRIZZLE_CONNECTION_PORT',
  'NITRO_DRIZZLE_CONNECTION_USER',
  'NITRO_DRIZZLE_CONNECTION_PASSWORD',
  'NITRO_DRIZZLE_CONNECTION_DATABASE',
] as const

const missing = CONNECTION_KEYS.filter(key => !env[key])
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}

function requireConnectionEnv(key: (typeof CONNECTION_KEYS)[number]): string {
  const value = env[key]
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const db = drizzle({
  connection: {
    host: requireConnectionEnv('NITRO_DRIZZLE_CONNECTION_HOST'),
    port: Number(requireConnectionEnv('NITRO_DRIZZLE_CONNECTION_PORT')),
    user: requireConnectionEnv('NITRO_DRIZZLE_CONNECTION_USER'),
    password: requireConnectionEnv('NITRO_DRIZZLE_CONNECTION_PASSWORD'),
    database: requireConnectionEnv('NITRO_DRIZZLE_CONNECTION_DATABASE'),
  },
})
try {
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, 'db/migrations') })
}
finally {
  await db.$client.end()
}
logger.success('Migrations applied')
