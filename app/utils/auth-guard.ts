import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { authRedirectFor } from './auth-routes'
import { isAuthSession } from './auth-session'

export async function authNavigationGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): Promise<void> {
  const { data: session } = await authClient.getSession()
  const redirect = authRedirectFor(
    to.path,
    to.fullPath,
    isAuthSession(session) ? session : null,
  )
  redirect ? next(redirect) : next()
}
