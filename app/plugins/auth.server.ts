import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'
import { authRedirectFor } from '../utils/auth-routes'
import { fetchAuthSession } from '../utils/auth-session'
import { AUTH_SESSION_QUERY_KEY } from '../utils/query-keys'

export default defineVuePlugin(async (context) => {
  if (context.environment !== 'server') {
    throw new TypeError('The server auth plugin requires a server context')
  }

  const session = await fetchAuthSession(context.appContext.$requestFetch)
  const url = new URL(context.request.url)
  const redirect = authRedirectFor(
    url.pathname,
    `${url.pathname}${url.search}`,
    session,
  )
  if (redirect) {
    return new Response(null, {
      status: 302,
      headers: { Location: redirect },
    })
  }

  context.queryCache.setQueryData(AUTH_SESSION_QUERY_KEY, session)
})
