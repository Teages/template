import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { defineTask } from 'nitro/task'
import { config } from '../../utils/drizzle'

export default defineTask({
  meta: {
    name: 'db:migrate',
    description: 'Run database migrations',
  },
  async run() {
    const { databaseUrl } = useRuntimeConfig()
    const db = drizzle({ ...config, connection: databaseUrl as string })
    const migrationsFolder = resolve(import.meta.dirname, '../../database/migrations')
    await migrate(db, { migrationsFolder })
    await db.$client.end()
    return { result: 'Migrations applied' }
  },
})
