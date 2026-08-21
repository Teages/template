import type { DrizzleDatabase } from './shared'
import { drizzle } from 'drizzle-orm/postgres-js'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { config } from './shared'

export function initProdDrizzle(): DrizzleDatabase {
  const connection = useRuntimeConfig().postgres
  const db = drizzle({
    ...config,
    connection: {
      host: connection.host,
      port: Number(connection.port) || 5433,
      user: connection.user,
      password: connection.password,
      database: connection.db,
    },
  })
  return db
}
