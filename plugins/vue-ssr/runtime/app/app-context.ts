import type { $Fetch } from 'ofetch'
import type { InjectionKey } from 'vue'
import { ofetch } from 'ofetch'

export const APP_CONTEXT_KEY: InjectionKey<AppContext> = Symbol('app-context')

export interface AppContext {
  /** Plain ofetch. During SSR it never inherits credentials from the request. */
  $fetch: $Fetch
  /** Inherits SSR credentials only for internal relative requests. */
  $requestFetch: $Fetch
}

export function createAppContext(init?: {
  $fetch?: $Fetch
  $requestFetch?: $Fetch
}): AppContext {
  const $fetch = init?.$fetch ?? ofetch
  return {
    $fetch,
    $requestFetch: init?.$requestFetch ?? $fetch,
  }
}
