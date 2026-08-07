import type { StateTree } from 'pinia'
import type { App } from 'vue'
import type { AppPayload } from './payload'
import {
  hydrateQueryCache,
  PiniaColada,
  PiniaColadaSSRNoGc,
  serializeQueryCache,
  useMutationCache,
  useQueryCache,
} from '@pinia/colada'
import { createPinia } from 'pinia'

export function installDataLayer(
  app: App,
  options: { payload?: AppPayload, ssr?: boolean } = {},
) {
  const pinia = createPinia()
  if (options.payload) {
    pinia.state.value = options.payload.pinia as StateTree
  }

  app.use(pinia)
  app.use(PiniaColada, {
    pinia,
    plugins: options.ssr ? [PiniaColadaSSRNoGc()] : [],
    queryOptions: {
      ssrCatchError: true,
    },
  })

  const queryCache = useQueryCache(pinia)
  if (options.payload) {
    hydrateQueryCache(queryCache, options.payload.queryCache)
  }

  return { pinia, queryCache }
}

export function createAppPayload(
  pinia: ReturnType<typeof createPinia>,
  queryCache: ReturnType<typeof useQueryCache>,
): AppPayload {
  const piniaState = { ...pinia.state.value }
  delete piniaState[queryCache.$id]
  delete piniaState[useMutationCache(pinia).$id]

  return {
    pinia: piniaState,
    queryCache: serializeQueryCache(queryCache),
  }
}
