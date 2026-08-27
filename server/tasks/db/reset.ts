import { getTableName, is, sql, Table } from 'drizzle-orm'
import { defineTask } from 'nitro/task'
import { useDrizzle } from '#drizzle'

/**
 * Clears every table in the dev database (test isolation between e2e runs).
 * Dev only — the bundled production task is a no-op.
 */
export default defineTask({
  meta: {
    name: 'db:reset',
    description: 'Truncate every table in the dev database',
  },
  async run() {
    if (!import.meta.dev) {
      return { result: false }
    }
    const { db, schema } = useDrizzle()
    const tables = Object.values(schema)
      .filter(value => is(value, Table))
      .map(table => sql.identifier(getTableName(table)))
    if (tables.length > 0) {
      await db.execute(sql`truncate table ${sql.join(tables, sql.raw(', '))} restart identity cascade`)
    }
    return { result: true }
  },
})
