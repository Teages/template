import { env } from 'node:process'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.NITRO_DATABASE_URL ?? 'postgresql://user:passwd@localhost:5433/mydb',
  },
})
