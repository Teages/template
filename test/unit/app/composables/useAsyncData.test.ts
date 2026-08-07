import { describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { useAsyncData } from '~/app/composables/useAsyncData'
import {
  APP_CONTEXT_KEY,
  createAppContext,
  createEmptyPayload,
} from '~/app/utils/app-context'

function withAppContext<T>(
  run: () => T,
  init?: Parameters<typeof createAppContext>[0],
): T {
  const app = createApp({ render: () => null })
  const ctx = createAppContext(init)
  app.provide(APP_CONTEXT_KEY, ctx)
  return app.runWithContext(run)
}

describe('useAsyncData', () => {
  it('skips the handler when hydrating from payload data', async () => {
    const payload = createEmptyPayload()
    payload.data.snapshot = { count: 7 }
    const handler = vi.fn(async () => ({ count: 0 }))

    const result = await withAppContext(
      () => useAsyncData('snapshot', handler),
      { payload, isHydrating: true },
    )

    expect(handler).not.toHaveBeenCalled()
    expect(result.data.value).toEqual({ count: 7 })
    expect(result.status.value).toBe('success')
  })

  it('runs the handler when the payload has no cached value', async () => {
    const handler = vi.fn(async () => ({ count: 3 }))

    const result = await withAppContext(() => useAsyncData('snapshot', handler))

    expect(handler).toHaveBeenCalledOnce()
    expect(result.data.value).toEqual({ count: 3 })
    expect(result.status.value).toBe('success')
  })

  it('dedupes concurrent executes for the same key', async () => {
    let resolveHandler!: (value: number) => void
    const handler = vi.fn(() => new Promise<number>((resolve) => {
      resolveHandler = resolve
    }))

    await withAppContext(async () => {
      const a = useAsyncData('shared', handler, { immediate: false })
      const b = useAsyncData('shared', handler, { immediate: false })

      const p1 = a.execute()
      const p2 = b.execute()
      expect(handler).toHaveBeenCalledOnce()

      resolveHandler(42)
      await Promise.all([p1, p2])

      expect(a.data.value).toBe(42)
      expect(b.data.value).toBe(42)
    })
  })

  it('serializes errors into the payload', async () => {
    const ctx = createAppContext()
    const app = createApp({ render: () => null })
    app.provide(APP_CONTEXT_KEY, ctx)

    await app.runWithContext(async () => {
      const result = await useAsyncData('boom', async () => {
        throw new Error('nope')
      })
      expect(result.status.value).toBe('error')
      expect(result.error.value?.message).toBe('nope')
      expect(ctx.payload.errors.boom).toEqual({
        name: 'Error',
        message: 'nope',
      })
    })
  })

  it('revives serialized errors while hydrating', async () => {
    const payload = createEmptyPayload()
    payload.errors.boom = { name: 'Error', message: 'cached failure' }
    const handler = vi.fn(async () => 1)

    const result = await withAppContext(
      () => useAsyncData('boom', handler),
      { payload, isHydrating: true },
    )

    expect(handler).not.toHaveBeenCalled()
    expect(result.error.value?.message).toBe('cached failure')
    expect(result.status.value).toBe('error')
  })
})
