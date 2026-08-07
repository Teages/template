import type { Ref } from 'vue'
import type { AppContext, SerializedAsyncDataError } from '~/app/utils/app-context'
import { onMounted, ref, shallowRef } from 'vue'
import { useAppContext } from './useAppContext'

export type AsyncDataStatus = 'idle' | 'pending' | 'success' | 'error'

export interface AsyncDataOptions<DataT, ResT = DataT> {
  readonly server?: boolean
  readonly lazy?: boolean
  readonly immediate?: boolean
  readonly default?: () => DataT
  readonly transform?: (input: ResT) => DataT | Promise<DataT>
  readonly getCachedData?: (key: string, ctx: AppContext) => DataT | undefined
}

export interface AsyncData<DataT> {
  readonly data: Ref<DataT>
  readonly pending: Ref<boolean>
  readonly error: Ref<Error | null>
  readonly status: Ref<AsyncDataStatus>
  readonly refresh: () => Promise<void>
  readonly execute: () => Promise<void>
}

export type AsyncDataReturn<DataT> = AsyncData<DataT> & Promise<AsyncData<DataT>>

function toError(value: unknown): Error {
  if (value instanceof Error)
    return value
  if (typeof value === 'string')
    return new Error(value)
  return new Error('Unknown async data error')
}

function serializeError(error: Error): SerializedAsyncDataError {
  return {
    name: error.name,
    message: error.message,
  }
}

function reviveError(value: SerializedAsyncDataError): Error {
  const error = new Error(value.message)
  error.name = value.name
  return error
}

function defaultGetCachedData<DataT>(
  key: string,
  ctx: AppContext,
): DataT | undefined {
  if (!ctx.isHydrating)
    return undefined
  if (!(key in ctx.payload.data))
    return undefined
  return ctx.payload.data[key] as DataT
}

function swallowExecuteError(promise: Promise<void>): Promise<void> {
  return promise.catch(() => {
    // Error is already reflected on `error` / `status`.
  })
}

export function useAsyncData<ResT, DataT = ResT>(
  key: string,
  handler: () => Promise<ResT>,
  options: AsyncDataOptions<DataT, ResT> = {},
): AsyncDataReturn<DataT> {
  const ctx = useAppContext()
  const server = options.server ?? true
  const lazy = options.lazy ?? false
  const immediate = options.immediate ?? true
  const getCachedData = options.getCachedData ?? defaultGetCachedData<DataT>

  const defaultValue = (options.default ? options.default() : null) as DataT
  const data = shallowRef(defaultValue) as Ref<DataT>
  const pending = ref(false)
  const error = shallowRef<Error | null>(null)
  const status = ref<AsyncDataStatus>('idle')

  const cached = getCachedData(key, ctx)
  const cachedError = ctx.isHydrating ? ctx.payload.errors[key] : undefined
  if (cached !== undefined) {
    data.value = cached
    status.value = 'success'
  }
  else if (cachedError) {
    error.value = reviveError(cachedError)
    status.value = 'error'
  }

  async function execute(): Promise<void> {
    const inflight = ctx._asyncDataPromises.get(key)
    if (inflight) {
      pending.value = true
      status.value = 'pending'
      try {
        await inflight
        if (key in ctx.payload.data) {
          data.value = ctx.payload.data[key] as DataT
          error.value = null
          status.value = 'success'
        }
      }
      catch {
        if (ctx.payload.errors[key]) {
          error.value = reviveError(ctx.payload.errors[key])
          status.value = 'error'
        }
      }
      finally {
        pending.value = false
      }
      return
    }

    pending.value = true
    status.value = 'pending'
    error.value = null

    const promise = (async () => {
      const raw = await handler()
      const transformed = options.transform
        ? await options.transform(raw)
        : raw as unknown as DataT
      ctx.payload.data[key] = transformed
      ctx.payload.errors[key] = null
      return transformed
    })()

    ctx._asyncDataPromises.set(key, promise)
    try {
      data.value = await promise
      status.value = 'success'
    }
    catch (cause: unknown) {
      const err = toError(cause)
      error.value = err
      status.value = 'error'
      ctx.payload.errors[key] = serializeError(err)
      delete ctx.payload.data[key]
      throw err
    }
    finally {
      ctx._asyncDataPromises.delete(key)
      pending.value = false
    }
  }

  async function refresh(): Promise<void> {
    delete ctx.payload.data[key]
    delete ctx.payload.errors[key]
    await execute()
  }

  let initialPromise: Promise<void> = Promise.resolve()

  const hasCachedResult = cached !== undefined || cachedError != null
  const shouldFetchOnServer = Boolean(import.meta.env.SSR)
    && server
    && immediate
    && !lazy
    && !hasCachedResult
  const shouldFetchOnClient = !import.meta.env.SSR
    && immediate
    && !hasCachedResult
    && !lazy
    && (server || !ctx.isHydrating)
  const shouldFetchAfterMount = !import.meta.env.SSR
    && immediate
    && !hasCachedResult
    && (lazy || (!server && ctx.isHydrating))

  if (shouldFetchOnServer || shouldFetchOnClient) {
    initialPromise = swallowExecuteError(execute())
  }
  else if (shouldFetchAfterMount) {
    onMounted(() => {
      void swallowExecuteError(execute())
    })
  }

  const asyncData: AsyncData<DataT> = {
    data,
    pending,
    error,
    status,
    refresh,
    execute,
  }

  // Attach fields onto a real Promise so `await useAsyncData()` works without
  // making the result a thenable that recursively unwraps itself.
  return Object.assign(initialPromise.then(() => asyncData), asyncData)
}
