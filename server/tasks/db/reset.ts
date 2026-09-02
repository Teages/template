import { sql } from 'drizzle-orm'
import { defineTask } from 'nitro/task'
import { useDrizzle } from '#drizzle'

export default defineTask({
  meta: {
    name: 'db:reset',
    description: 'Reset database tables (development only)',
  },
  async run() {
    if (!import.meta.dev) {
      throw new Error('task db:reset is only allowed in development mode')
    }

    const { db, schema } = useDrizzle()
    await db.execute(sql`TRUNCATE TABLE ${schema.todos} RESTART IDENTITY`)

    return { result: { ok: true } }
  },
})
