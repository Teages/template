import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import type { AuthSession, AuthSessionStore } from './auth-session'
import { authRedirectFor } from './auth-routes'
import { ensureAuthSession } from './auth-session'

/**
 * Reads the session from the query cache, fetching it once at hydration
 * (never per navigation). The server already gated the initial route with a
 * redirect, so a failed fetch degrades to the signed-out path.
 */
export function createAuthNavigationGuard(store: AuthSessionStore) {
  return async function authNavigationGuard(
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ): Promise<void> {
    let session: AuthSession | null = null
    try {
      session = await ensureAuthSession(store)
    }
    catch {
      session = null
    }
    const redirect = authRedirectFor(
      to.path,
      to.fullPath,
      session,
    )
    redirect ? next(redirect) : next()
  }
}
