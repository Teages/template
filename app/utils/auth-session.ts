export interface AuthUser {
  readonly id: string
  readonly name: string
  readonly email: string
}

export interface AuthSession {
  readonly user: AuthUser
  readonly session?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value))
    return false
  const user = value.user
  if (!isRecord(user))
    return false
  return typeof user.name === 'string'
    && typeof user.email === 'string'
    && typeof user.id === 'string'
}
