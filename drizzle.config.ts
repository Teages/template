import { env } from 'node:process'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    host: env.NITRO_POSTGRES_HOST || 'localhost',
    port: Number(env.NITRO_POSTGRES_PORT) || 5433,
    user: env.NITRO_POSTGRES_USER || 'user',
    password: env.NITRO_POSTGRES_PASSWORD ?? 'passwd',
    database: env.NITRO_POSTGRES_DB || 'mydb',
  },
})
