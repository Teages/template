import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

export interface PostgresConnection {
  readonly host: string
  readonly port: number
  readonly user: string
  readonly password: string
  readonly database: string
}

/**
 * Applies the Drizzle migrations in `migrationsFolder` with a short-lived
 * postgres-js client. Shared by the Nitro `db:migrate` task and the
 * standalone `.output/server/migrate.mjs` script.
 */
export async function runMigrations(
  migrationsFolder: string,
  connection: PostgresConnection,
): Promise<void> {
  const db = drizzle({ connection })
  try {
    await migrate(db, { migrationsFolder })
  }
  finally {
    await db.$client.end()
  }
}
