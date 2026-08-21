import type { DrizzleDatabase } from './shared'
import { createRequire } from 'node:module'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { config } from './shared'

let preparedDb: DrizzleDatabase

export function initDevDrizzle(): DrizzleDatabase {
  if (!preparedDb) {
    throw new Error('prepareDevDrizzle() must be called before initDevDrizzle()')
  }

  return preparedDb
}

export async function prepareDevDrizzle(): Promise<DrizzleDatabase> {
  const client = new PGlite()
  const db = drizzle({
    ...config,
    client,
  })

  await applySchema(db)
  preparedDb = db
  return db
}

export async function resetDatabase(): Promise<DrizzleDatabase> {
  if (!preparedDb) {
    return await prepareDevDrizzle()
  }

  await preparedDb.execute(sql`DROP SCHEMA public CASCADE`)
  await preparedDb.execute(sql`CREATE SCHEMA public`)
  await applySchema(preparedDb)
  return preparedDb
}

async function applySchema(db: DrizzleDatabase): Promise<void> {
  // drizzle-kit is a devDependency — only load when MOCK_DATABASE is active.
  const require = createRequire(import.meta.url)
  const { pushSchema } = require('drizzle-kit/api-postgres') as typeof import('drizzle-kit/api-postgres')
  const { apply } = await pushSchema(
    config.schema,
    db,
  )
  await apply()
}
