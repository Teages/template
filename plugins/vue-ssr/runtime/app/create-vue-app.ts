import type { RouterHistory } from 'vue-router'
import type { AppContext } from './app-context.ts'
import type { AppPayload } from './payload.ts'
import { createSSRApp, h, Suspense } from 'vue'
import { createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from '~/app/app.vue'
import { APP_CONTEXT_KEY } from './app-context.ts'
import { installDataLayer } from './data-layer.ts'

interface CreateClientVueAppOptions {
  readonly appContext: AppContext
  readonly environment: 'client'
  readonly history: RouterHistory
  readonly payload: AppPayload
}

interface CreateServerVueAppOptions {
  readonly appContext: AppContext
  readonly environment: 'server'
  readonly history: RouterHistory
}

type CreateVueAppOptions
  = | CreateClientVueAppOptions
    | CreateServerVueAppOptions

export function createVueApp(options: CreateVueAppOptions) {
  const app = createSSRApp({
    setup() {
      return () => h(Suspense, null, {
        default: () => h(App),
      })
    },
  })
  app.provide(APP_CONTEXT_KEY, options.appContext)

  const { pinia, queryCache } = options.environment === 'server'
    ? installDataLayer(app, { ssr: true })
    : installDataLayer(app, { payload: options.payload })
  const router = createRouter({
    history: options.history,
    routes,
  })

  return {
    app,
    pinia,
    queryCache,
    router,
  }
}
