import type { $Fetch } from 'ofetch'
import type { InjectionKey, Ref } from 'vue'
import { ofetch } from 'ofetch'

export const APP_PAYLOAD_ELEMENT_ID = '__APP_PAYLOAD__' as const

export const APP_CONTEXT_KEY: InjectionKey<AppContext> = Symbol('app-context')

export interface SerializedAsyncDataError {
  readonly name: string
  readonly message: string
}

/** Per-request / per-hydration payload transferred via HTML. */
export interface AppPayload {
  data: Record<string, unknown>
  state: Record<string, unknown>
  errors: Record<string, SerializedAsyncDataError | null>
}

export interface AppContext {
  /** Plain ofetch. During SSR it never inherits credentials from the request. */
  $fetch: $Fetch
  /** Inherits SSR credentials only for internal relative requests. */
  $requestFetch: $Fetch
  payload: AppPayload
  isHydrating: boolean
  /** In-flight useAsyncData promises keyed by cache key (mutable cache). */
  _asyncDataPromises: Map<string, Promise<unknown>>
  /** useState Ref cache keyed by state key (mutable cache). */
  _stateRefs: Map<string, Ref<unknown>>
}

export function createEmptyPayload(): AppPayload {
  return {
    data: {},
    state: {},
    errors: {},
  }
}

export function createAppContext(init?: {
  $fetch?: $Fetch
  $requestFetch?: $Fetch
  payload?: AppPayload
  isHydrating?: boolean
}): AppContext {
  const $fetch = init?.$fetch ?? ofetch
  return {
    $fetch,
    $requestFetch: init?.$requestFetch ?? $fetch,
    payload: init?.payload ?? createEmptyPayload(),
    isHydrating: init?.isHydrating ?? false,
    _asyncDataPromises: new Map(),
    _stateRefs: new Map(),
  }
}
