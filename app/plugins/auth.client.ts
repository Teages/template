import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'
import { authNavigationGuard } from '../utils/auth-guard'

export default defineVuePlugin((context) => {
  if (context.environment !== 'client') {
    throw new TypeError('The client auth plugin requires a client context')
  }
  context.router.beforeEach(authNavigationGuard)
})
