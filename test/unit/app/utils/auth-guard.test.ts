import type { useQueryCache } from '@pinia/colada'
import type { $Fetch } from 'ofetch'
import type { RouteLocationNormalized } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { createAuthNavigationGuard } from '~/app/utils/auth-guard'

type QueryCache = ReturnType<typeof useQueryCache>

const authSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
    createdAt: new Date('2026-08-14T00:00:00.000Z'),
    updatedAt: new Date('2026-08-14T00:00:00.000Z'),
  },
  session: {
    id: 'session-1',
    userId: 'user-1',
    token: 'token',
    createdAt: new Date('2026-08-14T00:00:00.000Z'),
    updatedAt: new Date('2026-08-14T00:00:00.000Z'),
    expiresAt: new Date('2026-08-21T00:00:00.000Z'),
  },
}

function createQueryCacheStub(options: {
  status: 'pending' | 'success' | 'error'
  data?: unknown
  fetchImpl?: () => Promise<unknown>
}) {
  const state = shallowRef({ status: options.status })
  const fetchAction = vi.fn(options.fetchImpl ?? (async () => {
    state.value = { status: 'success' }
  }))
  const cache = {
    ensure: vi.fn(() => ({ state })),
    fetch: fetchAction,
    getQueryData: vi.fn(() => options.data),
    setQueryData: vi.fn(),
  } as unknown as QueryCache
  return { cache, fetchAction }
}

function createGuard(cache: QueryCache) {
  return createAuthNavigationGuard({
    queryCache: cache,
    $requestFetch: vi.fn() as unknown as $Fetch,
  })
}

const to = { path: '/', fullPath: '/' } as unknown as RouteLocationNormalized
const from = {} as unknown as RouteLocationNormalized

describe('createAuthNavigationGuard', () => {
  it('fetches the session on first navigation and allows protected routes', async () => {
    const { cache, fetchAction } = createQueryCacheStub({
      status: 'pending',
      data: authSession,
    })
    const next = vi.fn()

    await createGuard(cache)(to, from, next)

    expect(fetchAction).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0]?.length).toBe(0)
  })

  it('redirects unauthenticated navigation to sign-in with the original path', async () => {
    const { cache } = createQueryCacheStub({ status: 'pending', data: null })
    const next = vi.fn()

    await createGuard(cache)(to, from, next)

    expect(next).toHaveBeenCalledWith('/sign-in?redirect=%2F')
  })

  it('serves later navigations from the cache without refetching', async () => {
    const { cache, fetchAction } = createQueryCacheStub({
      status: 'success',
      data: authSession,
    })
    const guard = createGuard(cache)
    const first = vi.fn()
    const second = vi.fn()

    await guard(to, from, first)
    await guard(to, from, second)

    expect(fetchAction).not.toHaveBeenCalled()
    expect(first.mock.calls[0]?.length).toBe(0)
    expect(second.mock.calls[0]?.length).toBe(0)
  })

  it('degrades to the signed-out path when the session fetch fails', async () => {
    const { cache } = createQueryCacheStub({
      status: 'pending',
      fetchImpl: async () => {
        throw new Error('network down')
      },
    })
    const next = vi.fn()

    await createGuard(cache)(to, from, next)

    expect(next).toHaveBeenCalledWith('/sign-in?redirect=%2F')
  })
})
