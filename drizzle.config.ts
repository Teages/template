import { defineConfig } from 'drizzle-kit'
import { readPostgresConnection } from './server/utils/postgres-connection.ts'

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: readPostgresConnection(),
})
