import type { DrizzleConfig } from 'drizzle-orm'
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { createRequire } from 'node:module'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { relations } from '../database/relations'
import * as schema from '../database/schema'
import { todos } from '../database/schema'

export type DrizzleDatabase = PgAsyncDatabase<PgQueryResultHKT, typeof schema, typeof relations>

const config: DrizzleConfig<typeof schema, typeof relations> & {
  schema: typeof schema
  relations: typeof relations
} = {
  schema,
  relations,
}

const require = createRequire(import.meta.url)
const { pushSchema } = require('drizzle-kit/api-postgres') as typeof import('drizzle-kit/api-postgres')

export interface CreatePgliteDatabaseOptions {
  seed?: boolean
}

export async function createPgliteDatabase(
  options: CreatePgliteDatabaseOptions = {},
): Promise<DrizzleDatabase> {
  const { seed = false } = options

  const client = new PGlite()
  const db = drizzle({
    ...config,
    client,
  })

  const { apply } = await pushSchema(
    config.schema,
    db as unknown as PgAsyncDatabase<never>,
  )

  await apply()

  if (seed) {
    await seedDatabase(db)
  }

  return db
}

export async function clearDatabase(db: DrizzleDatabase): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE ${todos} RESTART IDENTITY`)
}

export async function seedDatabase(_db: DrizzleDatabase): Promise<void> {
}

export function assertMockDatabase(taskName: string): void {
  if (!import.meta.MOCK_DATABASE) {
    throw new Error(`${taskName} is only allowed when using mock database`)
  }
}
