const publicPaths = new Set(['/sign-in', '/sign-up'])

interface AuthRouteSession {
  readonly user: object
}

export function authRedirectFor(
  path: string,
  fullPath: string,
  session: AuthRouteSession | null,
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
