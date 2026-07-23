import type { DrizzleConfig } from 'drizzle-orm'
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { relations } from '../database/relations'
import * as schema from '../database/schema'

export type DrizzleDatabase = PgAsyncDatabase<PgQueryResultHKT, typeof relations>

export const config: DrizzleConfig<typeof schema, typeof relations> & {
  schema: typeof schema
  relations: typeof relations
} = {
  schema,
  relations,
}

function initDrizzle(): DrizzleDatabase {
  if (process.env.MOCK_DATABASE) {
    throw new Error(
      'PGlite database not initialized. Ensure the pglite-e2e plugin runs before handling requests.',
    )
  }

  const runtimeConfig = useRuntimeConfig()
  const db = drizzle({
    ...config,
    connection: runtimeConfig.databaseUrl as string,
  }) as unknown as DrizzleDatabase
  return db
}

let _db: DrizzleDatabase | null = null
export function useDrizzle(): {
  db: DrizzleDatabase
  schema: typeof schema
  relations: typeof relations
} {
  _db ??= initDrizzle()

  return { db: _db, schema, relations }
}

/**
 * Injects a custom Drizzle database instance
 * @internal
 */
export function injectDrizzle(db: DrizzleDatabase) {
  _db = db
}
