import { defineVuePlugin } from '~/plugins/vue-ssr/runtime/app/vue-plugin'

export default defineVuePlugin(async (context) => {
  if (context.environment !== 'client') {
    throw new TypeError('The DevTools plugin requires a client context')
  }
  if (import.meta.env.DEV) {
    await import('@vitejs/devtools/client/inject')
  }
})
