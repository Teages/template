import { resolve } from 'node:path'
import { runMigrations } from '../utils/db-migrate'
import { logger } from '../utils/logger'

// Bundled to .output/server/migrate.mjs by vite.config.migrate.ts; the SQL
// migrations are copied alongside as database/migrations so a slim node
// image can run this without pnpm or dev dependencies.
await runMigrations(resolve(import.meta.dirname, 'database/migrations'))
logger.success('Migrations applied')
