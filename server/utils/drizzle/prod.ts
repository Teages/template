import type { DrizzleDatabase } from './shared'
import { env } from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { config } from './shared'

export interface AssertExplicitPostgresOptions {
  /**
   * Fail when `NITRO_POSTGRES_*` is missing from the environment instead of
   * accepting the `runtimeConfig.postgres` defaults. Defaults to true in
   * built servers (`import.meta.dev === false`): a production start with
   * missing `NITRO_POSTGRES_*` must not silently target localhost.
   */
  readonly requireExplicit?: boolean
}

/**
 * Fails fast when a built server would fall back to the compose.dev-shaped
 * `runtimeConfig.postgres` defaults because `NITRO_POSTGRES_*` was not set.
 * Dev keeps the defaults so `pnpm dev:prod` works without extra env.
 */
export function assertExplicitPostgresConfig(
  env: NodeJS.ProcessEnv,
  { requireExplicit = import.meta.dev === false }: AssertExplicitPostgresOptions = {},
): void {
  if (!requireExplicit) {
    return
  }

  const portRaw = env.NITRO_POSTGRES_PORT?.trim()
  if (portRaw) {
    const port = Number(portRaw)
    if (!(Number.isFinite(port) && port > 0))
      throw new Error('NITRO_POSTGRES_PORT is not a valid port number.')
  }

  const missing: string[] = (['NITRO_POSTGRES_HOST', 'NITRO_POSTGRES_USER', 'NITRO_POSTGRES_DB'] as const)
    .filter(key => !env[key]?.trim())
  if (env.NITRO_POSTGRES_PASSWORD === undefined)
    missing.push('NITRO_POSTGRES_PASSWORD')
  if (!portRaw)
    missing.push('NITRO_POSTGRES_PORT')
  if (missing.length > 0) {
    throw new Error(
      `Missing NITRO_POSTGRES_* environment variables: ${missing.join(', ')}. `
      + 'Built servers do not fall back to the runtimeConfig defaults; '
      + 'set the NITRO_POSTGRES_* environment variables (see compose.yaml).',
    )
  }
}

export function initProdDrizzle(): DrizzleDatabase {
  assertExplicitPostgresConfig(env)

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
  }) as unknown as DrizzleDatabase
  return db
}
