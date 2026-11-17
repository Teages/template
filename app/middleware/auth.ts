import { defineNuxtRouteMiddleware, navigateTo, useFetch } from '#app'
import { authClient } from '~/utils/auth-client'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch)

  if (!session.value) {
    return await navigateTo({
      path: '/sign-in',
      query: { redirect: to.fullPath },
    })
  }
})
