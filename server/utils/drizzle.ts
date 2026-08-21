import type { DrizzleConfig } from 'drizzle-orm'
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import { relations } from '../database/relations'
import * as schema from '../database/schema'
import { readPostgresConnection } from './postgres-connection'

export type DrizzleDatabase = PgAsyncDatabase<PgQueryResultHKT, typeof relations>

export const config: DrizzleConfig<typeof schema, typeof relations> & {
  schema: typeof schema
  relations: typeof relations
} = {
  schema,
  relations,
}

function initDrizzle(): DrizzleDatabase {
  if (import.meta.MOCK_DATABASE) {
    throw new Error(
      'PGlite database not initialized. Ensure the server/plugins/pglite-mock.ts startup plugin runs before handling requests.',
    )
  }

  const db = drizzle({
    ...config,
    connection: readPostgresConnection(),
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

/** @internal */
export function injectDrizzle(db: DrizzleDatabase): void {
  _db = db
}
