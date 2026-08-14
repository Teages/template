import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { readPostgresConnection } from './postgres-connection'

/**
 * Applies the Drizzle migrations in `migrationsFolder` with a short-lived
 * postgres-js client. Shared by the Nitro `db:migrate` task and the
 * standalone `.output/server/migrate.mjs` script.
 */
export async function runMigrations(migrationsFolder: string): Promise<void> {
  const db = drizzle({ connection: readPostgresConnection() })
  try {
    await migrate(db, { migrationsFolder })
  }
  finally {
    await db.$client.end()
  }
}
