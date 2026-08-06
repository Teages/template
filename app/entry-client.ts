import ui from '@nuxt/ui/vue-plugin'

import { createSSRApp, h, Suspense } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'
import App from './app.vue'
import { APP_CONTEXT_KEY, createAppContext } from './utils/app-context.ts'
import { authNavigationGuard } from './utils/auth-guard.ts'

import { readPayloadFromDocument } from './utils/payload.ts'
import './assets/css/main.css'

// Nitro serves HTML, so Vite's transformIndexHtml inject is skipped — load manually.
if (import.meta.env.DEV)
  import('@vitejs/devtools/client/inject')

async function main() {
  const appContext = createAppContext({
    payload: readPayloadFromDocument(),
    isHydrating: true,
  })

  const app = createSSRApp({
    setup() {
      return () => h(Suspense, null, { default: () => h(App) })
    },
  })
  app.provide(APP_CONTEXT_KEY, appContext)

  const router = createRouter({ history: createWebHistory(), routes })
  router.beforeEach(authNavigationGuard)
  app.use(router)
  app.use(ui)

  if (import.meta.hot) {
    handleHotUpdate(router)
  }

  await router.isReady()
  app.mount('#root')
  appContext.isHydrating = false
}

main()
