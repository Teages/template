export interface AuthUser {
  readonly id: string
  readonly name: string
  readonly email: string
}

export interface AuthSession {
  readonly user: AuthUser
  readonly session?: Record<string, unknown>
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null || !('user' in value))
    return false
  const user = value.user
  if (typeof user !== 'object' || user === null)
    return false
  return typeof user.name === 'string'
    && typeof user.email === 'string'
    && typeof user.id === 'string'
}
