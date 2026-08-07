import ui from '@nuxt/ui/vue-plugin'

import { ofetch } from 'ofetch'
import { createSSRApp, h, Suspense } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'
import App from './app.vue'
import { APP_CONTEXT_KEY, createAppContext } from './utils/app-context'
import { authNavigationGuard } from './utils/auth-guard'
import { installDataLayer } from './utils/data-layer'
import { readPayloadFromDocument } from './utils/payload'
import './assets/css/main.css'

// Nitro serves HTML, so Vite's transformIndexHtml inject is skipped — load manually.
if (import.meta.env.DEV)
  import('@vitejs/devtools/client/inject')

async function main() {
  const appContext = createAppContext({ $fetch: ofetch })
  const payload = readPayloadFromDocument()

  const app = createSSRApp({
    setup() {
      return () => h(Suspense, null, { default: () => h(App) })
    },
  })
  app.provide(APP_CONTEXT_KEY, appContext)
  installDataLayer(app, { payload })

  const router = createRouter({ history: createWebHistory(), routes })
  router.beforeEach(authNavigationGuard)
  app.use(router)
  app.use(ui)

  if (import.meta.hot) {
    handleHotUpdate(router)
  }

  await router.isReady()
  app.mount('#root')
}

main()
