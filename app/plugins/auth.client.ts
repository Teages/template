import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'
import { createAuthNavigationGuard } from '../utils/auth-guard'

export default defineVuePlugin((context) => {
  if (context.environment !== 'client') {
    throw new TypeError('The client auth plugin requires a client context')
  }
  context.router.beforeEach(createAuthNavigationGuard({
    queryCache: context.queryCache,
    $requestFetch: context.appContext.$requestFetch,
  }))
})
