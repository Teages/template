import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

const publicPaths = new Set(['/sign-in', '/sign-up'])

export async function authNavigationGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): Promise<void> {
  const { data: session } = await authClient.getSession()

  if (publicPaths.has(to.path)) {
    if (session?.user) {
      next('/')
      return
    }
    next()
    return
  }

  if (!session?.user) {
    next({
      path: '/sign-in',
      query: { redirect: to.fullPath },
    })
    return
  }

  next()
}
