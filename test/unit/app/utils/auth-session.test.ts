import type { useQueryCache } from '@pinia/colada'
import type { $Fetch } from 'ofetch'
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { ensureAuthSession, refreshAuthSession } from '~/app/utils/auth-session'
import { AUTH_SESSION_QUERY_KEY } from '~/app/utils/query-keys'

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

describe('ensureAuthSession', () => {
  it('fetches while the entry is pending and returns the cached session', async () => {
    const { cache, fetchAction } = createQueryCacheStub({
      status: 'pending',
      data: authSession,
    })
    await expect(ensureAuthSession({ queryCache: cache, $requestFetch: vi.fn() as unknown as $Fetch }))
      .resolves
      .toBe(authSession)
    expect(fetchAction).toHaveBeenCalledTimes(1)
  })

  it('reuses the resolved cache entry without refetching', async () => {
    const { cache, fetchAction } = createQueryCacheStub({
      status: 'success',
      data: authSession,
    })
    const store = { queryCache: cache, $requestFetch: vi.fn() as unknown as $Fetch }
    await expect(ensureAuthSession(store)).resolves.toBe(authSession)
    await expect(ensureAuthSession(store)).resolves.toBe(authSession)
    expect(fetchAction).not.toHaveBeenCalled()
  })

  it('retries the fetch after a previous error', async () => {
    const { cache, fetchAction } = createQueryCacheStub({
      status: 'error',
      data: authSession,
    })
    await expect(ensureAuthSession({ queryCache: cache, $requestFetch: vi.fn() as unknown as $Fetch }))
      .resolves
      .toBe(authSession)
    expect(fetchAction).toHaveBeenCalledTimes(1)
  })

  it('returns null for cached values that do not validate as a session', async () => {
    const { cache } = createQueryCacheStub({ status: 'success', data: { nope: true } })
    await expect(ensureAuthSession({ queryCache: cache, $requestFetch: vi.fn() as unknown as $Fetch }))
      .resolves
      .toBeNull()
  })

  it('propagates fetch failures so callers can degrade to signed-out', async () => {
    const { cache } = createQueryCacheStub({
      status: 'pending',
      fetchImpl: async () => {
        throw new Error('network down')
      },
    })
    await expect(ensureAuthSession({ queryCache: cache, $requestFetch: vi.fn() as unknown as $Fetch }))
      .rejects
      .toThrow('network down')
  })
})

describe('refreshAuthSession', () => {
  it('fetches the session and stores it in the query cache', async () => {
    const { cache } = createQueryCacheStub({ status: 'pending' })
    const $requestFetch = vi.fn(async (_url: string, init: { parseResponse: (text: string) => unknown }) =>
      init.parseResponse(JSON.stringify(authSession)),
    ) as unknown as $Fetch

    const session = await refreshAuthSession({ queryCache: cache, $requestFetch })

    expect($requestFetch).toHaveBeenCalledWith('/api/auth/get-session', expect.anything())
    expect(session?.user.email).toBe('test@example.com')
    expect(cache.setQueryData).toHaveBeenCalledWith(AUTH_SESSION_QUERY_KEY, session)
  })
})
