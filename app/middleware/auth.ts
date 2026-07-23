export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch)

  if (!session.value) {
    return navigateTo({
      path: '/sign-in',
      query: { redirect: to.fullPath },
    })
  }
})
