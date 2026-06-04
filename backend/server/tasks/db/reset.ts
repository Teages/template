import { defineTask } from 'nitro/task'
import { useDrizzle } from '~/server/utils/drizzle'
import { assertMockDatabase, clearDatabase } from '~/server/utils/pglite-db'

export default defineTask({
  meta: {
    name: 'db:reset',
    description: 'Reset database tables (MOCK_DATABASE only)',
  },
  async run() {
    assertMockDatabase('task db:reset')

    const { db } = useDrizzle()
    await clearDatabase(db)

    return { result: { ok: true } }
  },
})
