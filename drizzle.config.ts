import { env, loadEnvFile } from 'node:process'
import { defineConfig } from 'drizzle-kit'

loadEnvFile()

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.NITRO_DATABASE_URL!,
  },
})
