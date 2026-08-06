import type { AuthSession } from './auth-session.ts'

const publicPaths = new Set(['/sign-in', '/sign-up'])

export function authRedirectFor(
  path: string,
  fullPath: string,
  session: AuthSession | null,
): string | null {
  if (publicPaths.has(path)) {
    return session?.user && (path === '/sign-in' || path === '/sign-up')
      ? '/'
      : null
  }
  if (session?.user)
    return null
  return `/sign-in?redirect=${encodeURIComponent(fullPath)}`
}
