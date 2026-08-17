import { resolve } from 'node:path'
import { env } from 'node:process'
import { runMigrations } from '../utils/db-migrate'
import { logger } from '../utils/logger'

// Bundled to .output/server/migrate.mjs by vite.config.migrate.ts; the SQL
// migrations are copied alongside as database/migrations so a slim node
// image can run this without pnpm or dev dependencies.
await runMigrations(resolve(import.meta.dirname, 'database/migrations'), {
  host: env.NITRO_POSTGRES_HOST || 'localhost',
  port: Number(env.NITRO_POSTGRES_PORT) || 5433,
  user: env.NITRO_POSTGRES_USER || 'user',
  password: env.NITRO_POSTGRES_PASSWORD ?? 'passwd',
  database: env.NITRO_POSTGRES_DB || 'mydb',
})
logger.success('Migrations applied')
