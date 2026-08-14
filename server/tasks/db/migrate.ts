import { resolve } from 'node:path'
import { defineTask } from 'nitro/task'
import { runMigrations } from '../../utils/db-migrate'

export default defineTask({
  meta: {
    name: 'db:migrate',
    description: 'Run database migrations',
  },
  async run() {
    await runMigrations(resolve(import.meta.dirname, '../../database/migrations'))
    return { result: 'Migrations applied' }
  },
})
