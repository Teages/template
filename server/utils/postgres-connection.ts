import { env } from 'node:process'

export type PostgresEnvSource = Readonly<Record<string, string | undefined>>

export interface PostgresConnection {
  readonly host: string
  readonly port: number
  readonly user: string
  readonly password: string
  readonly database: string
}

const DEFAULT_POSTGRES_CONNECTION = {
  host: 'localhost',
  port: 5433,
  user: 'user',
  password: 'passwd',
  database: 'mydb',
} as const satisfies PostgresConnection

function readTextField(
  source: PostgresEnvSource,
  key: string,
  fallback: string,
): string {
  return source[key]?.trim() || fallback
}

export interface ReadPostgresConnectionOptions {
  /**
   * Fail instead of falling back to the compose.dev defaults. Defaults to
   * true in built servers (`import.meta.dev === false`): a production start
   * with missing POSTGRES_* must not silently target localhost.
   */
  readonly requireExplicit?: boolean
}

export function readPostgresConnection(
  source: PostgresEnvSource = env,
  { requireExplicit = import.meta.dev === false }: ReadPostgresConnectionOptions = {},
): PostgresConnection {
  const portRaw = source.POSTGRES_PORT?.trim()
  const port = portRaw ? Number(portRaw) : DEFAULT_POSTGRES_CONNECTION.port

  if (requireExplicit) {
    if (portRaw && !(Number.isFinite(port) && port > 0))
      throw new Error('POSTGRES_PORT is not a valid port number.')
    const missing: string[] = (['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_DB'] as const)
      .filter(key => !source[key]?.trim())
    if (source.POSTGRES_PASSWORD === undefined)
      missing.push('POSTGRES_PASSWORD')
    if (!portRaw)
      missing.push('POSTGRES_PORT')
    if (missing.length > 0) {
      throw new Error(
        `Missing POSTGRES_* environment variables: ${missing.join(', ')}. `
        + 'Built servers do not fall back to the local compose.dev defaults; '
        + 'set the structured POSTGRES_* fields (see compose.yaml).',
      )
    }
  }

  return {
    host: readTextField(source, 'POSTGRES_HOST', DEFAULT_POSTGRES_CONNECTION.host),
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_POSTGRES_CONNECTION.port,
    user: readTextField(source, 'POSTGRES_USER', DEFAULT_POSTGRES_CONNECTION.user),
    password: source.POSTGRES_PASSWORD ?? DEFAULT_POSTGRES_CONNECTION.password,
    database: readTextField(source, 'POSTGRES_DB', DEFAULT_POSTGRES_CONNECTION.database),
  }
}
