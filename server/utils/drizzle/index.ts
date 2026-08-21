import type { DrizzleDatabase } from './shared'
import { relations } from '~/server/database/relations'
import * as schema from '~/server/database/schema'
import { initDevDrizzle } from './dev'
import { initProdDrizzle } from './prod'

export type { DrizzleDatabase }

let _db: DrizzleDatabase | null = null

export function useDrizzle(): {
  db: DrizzleDatabase
  schema: typeof schema
  relations: typeof relations
} {
  _db ??= import.meta.MOCK_DATABASE
    ? initDevDrizzle()
    : initProdDrizzle()

  return { db: _db, schema, relations }
}
