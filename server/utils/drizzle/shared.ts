import type { DrizzleConfig } from 'drizzle-orm'
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { relations } from '~/server/database/relations'
import * as schema from '~/server/database/schema'

export type DrizzleDatabase = PgAsyncDatabase<PgQueryResultHKT, typeof relations>

export const config: DrizzleConfig<typeof schema, typeof relations> & {
  schema: typeof schema
  relations: typeof relations
} = {
  schema,
  relations,
}
