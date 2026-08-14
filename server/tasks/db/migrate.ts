import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { defineTask } from 'nitro/task'
import { config } from '../../utils/drizzle'
import { readPostgresConnection } from '../../utils/postgres-connection'

export default defineTask({
  meta: {
    name: 'db:migrate',
    description: 'Run database migrations',
  },
  async run() {
    const db = drizzle({ ...config, connection: readPostgresConnection() })
    const migrationsFolder = resolve(import.meta.dirname, '../../database/migrations')
    await migrate(db, { migrationsFolder })
    await db.$client.end()
    return { result: 'Migrations applied' }
  },
})
