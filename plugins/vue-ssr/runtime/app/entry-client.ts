import { createHead } from '@unhead/vue/client'
import { ofetch } from 'ofetch'
import { createWebHistory } from 'vue-router'
import { handleHotUpdate } from 'vue-router/auto-routes'
import { createAppContext } from './app-context.ts'
import { createVueApp } from './create-vue-app.ts'
import { clientVuePlugins } from './load-plugins.client.ts'
import { readPayloadFromDocument } from './payload.ts'
import { initializeVueApp } from './vue-plugin.ts'

async function main(): Promise<void> {
  const appContext = createAppContext({ $fetch: ofetch })
  const payload = readPayloadFromDocument()
  const { app, queryCache, router } = createVueApp({
    appContext,
    environment: 'client',
    history: createWebHistory(),
    payload,
  })
  // The client head takes over the server-rendered <head> tags during
  // hydration and keeps them in sync with useHead() calls afterwards.
  app.use(createHead())

  await initializeVueApp({
    environment: 'client',
    app,
    appContext,
    queryCache,
    router,
  }, clientVuePlugins)

  if (import.meta.hot) {
    handleHotUpdate(router)
  }

  await router.isReady()
  app.mount('#root')
}

void main()
