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

export function readPostgresConnection(
  source: PostgresEnvSource = env,
): PostgresConnection {
  const portRaw = source.POSTGRES_PORT?.trim()
  const port = portRaw ? Number(portRaw) : DEFAULT_POSTGRES_CONNECTION.port

  return {
    host: readTextField(source, 'POSTGRES_HOST', DEFAULT_POSTGRES_CONNECTION.host),
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_POSTGRES_CONNECTION.port,
    user: readTextField(source, 'POSTGRES_USER', DEFAULT_POSTGRES_CONNECTION.user),
    password: source.POSTGRES_PASSWORD ?? DEFAULT_POSTGRES_CONNECTION.password,
    database: readTextField(source, 'POSTGRES_DB', DEFAULT_POSTGRES_CONNECTION.database),
  }
}
