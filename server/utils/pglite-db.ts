import type { DrizzleConfig } from 'drizzle-orm'
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { createRequire } from 'node:module'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { relations } from '../database/relations'
import * as schema from '../database/schema'

export type DrizzleDatabase = PgAsyncDatabase<PgQueryResultHKT, typeof relations>

export interface PgliteDatabaseHandle {
  db: DrizzleDatabase
  client: PGlite
}

const config: DrizzleConfig<typeof schema, typeof relations> & {
  schema: typeof schema
  relations: typeof relations
} = {
  schema,
  relations,
}

export interface CreatePgliteDatabaseOptions {
  seed?: boolean
}

async function applySchema(db: DrizzleDatabase): Promise<void> {
  // drizzle-kit is a devDependency — only load when MOCK_DATABASE is active.
  const require = createRequire(import.meta.url)
  const { pushSchema } = require('drizzle-kit/api-postgres') as typeof import('drizzle-kit/api-postgres')
  const { apply } = await pushSchema(
    config.schema,
    db as unknown as PgAsyncDatabase<never>,
  )
  await apply()
}

export async function createPgliteDatabase(
  options: CreatePgliteDatabaseOptions = {},
): Promise<PgliteDatabaseHandle> {
  const { seed = false } = options

  const client = new PGlite()
  const db = drizzle({
    ...config,
    client,
  })

  await applySchema(db)

  if (seed) {
    await seedDatabase(db)
  }

  return { db, client }
}

export async function clearDatabase(db: DrizzleDatabase): Promise<void> {
  await db.execute(sql`DROP SCHEMA public CASCADE`)
  await db.execute(sql`CREATE SCHEMA public`)
  await applySchema(db)
}

export async function seedDatabase(_db: DrizzleDatabase): Promise<void> {
}

export function assertMockDatabase(taskName: string): void {
  if (!import.meta.MOCK_DATABASE) {
    throw new Error(`${taskName} is only allowed when using mock database`)
  }
}
