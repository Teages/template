import { resolve } from 'node:path'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineTask } from 'nitro/task'
import { runMigrations } from '../../utils/db-migrate'

export default defineTask({
  meta: {
    name: 'db:migrate',
    description: 'Run database migrations',
  },
  async run() {
    const config = useRuntimeConfig().postgres
    await runMigrations(
      resolve(import.meta.dirname, '../../database/migrations'),
      {
        host: config.host,
        port: Number(config.port) || 5433,
        user: config.user,
        password: config.password,
        database: config.db,
      },
    )
    return { result: 'Migrations applied' }
  },
})
