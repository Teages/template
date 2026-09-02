import { resolve } from 'node:path'
import { env } from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

// Bundled to .output/migrate/main.mjs by modules/migration.ts, which also
// copies the SQL migrations to .output/migrate/migrations, so a slim node
// image can run this without pnpm or dev dependencies.
const CONNECTION_KEYS = [
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
] as const

async function main() {
  const missing = CONNECTION_KEYS.filter(key => !env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  function requireConnectionEnv(key: (typeof CONNECTION_KEYS)[number]): string {
    const value = env[key]
    if (value === undefined) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return value
  }

  const db = drizzle({
    connection: {
      host: requireConnectionEnv('POSTGRES_HOST'),
      port: Number(requireConnectionEnv('POSTGRES_PORT')),
      user: requireConnectionEnv('POSTGRES_USER'),
      password: requireConnectionEnv('POSTGRES_PASSWORD'),
      database: requireConnectionEnv('POSTGRES_DB'),
    },
  })
  try {
    await migrate(db, { migrationsFolder: resolve(import.meta.dirname, 'migrations') })
  }
  finally {
    await db.$client.end()
  }
}

// eslint-disable-next-line antfu/no-top-level-await
await main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.info('Migrations completed successfully.')
  })
  .catch((cause) => {
    throw new Error('Migrations failed', { cause })
  })
