import type { $Fetch } from 'ofetch'
import type { InjectionKey } from 'vue'
import { ofetch } from 'ofetch'

// Registry symbol (not `Symbol(...)`): Nitro's dev worker re-imports the SSR
// entry on reload while request-time `import()`s already re-evaluate fresh, so
// both module copies can meet in one straddled render — a registry symbol is
// the same key in both, keeping provide/inject intact through the race.
export const APP_CONTEXT_KEY: InjectionKey<AppContext> = Symbol.for('template:app-context')

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
