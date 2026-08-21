import type {
  AuthRateLimitStorage,
} from '~/server/auth/rate-limit'
import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTH_RATE_LIMIT_MOUNT,
  authRateLimitEntryCount,
  consumeAuthRateLimit,
  resetAuthRateLimits,
} from '~/server/auth/rate-limit'

describe('auth rate limit mount', () => {
  it('is the Nitro KV memory mount name', () => {
    expect(AUTH_RATE_LIMIT_MOUNT).toBe('better-auth:rate-limit')
  })
})

describe('consumeAuthRateLimit', () => {
  const storage = createMemoryAuthRateLimitStorage()

  afterEach(async () => {
    await resetAuthRateLimits(storage)
  })

  it('allows three sign-in attempts per IP and email within 10 seconds', async () => {
    const now = 1_000_000
    const input = {
      operation: 'signInEmail',
      ip: '203.0.113.10',
      email: 'user@test.local',
      now,
    } as const

    expect(await consumeAuthRateLimit(input, storage)).toBe(true)
    expect(await consumeAuthRateLimit({ ...input, now: now + 1 }, storage)).toBe(true)
    expect(await consumeAuthRateLimit({ ...input, now: now + 2 }, storage)).toBe(true)
    expect(await consumeAuthRateLimit({ ...input, now: now + 3 }, storage)).toBe(false)
  })

  it('applies the same 3/10s window to sign-up', async () => {
    const now = 2_000_000
    const input = {
      operation: 'signUpEmail',
      ip: '203.0.113.10',
      email: 'new@test.local',
      now,
    } as const

    expect(await consumeAuthRateLimit(input, storage)).toBe(true)
    expect(await consumeAuthRateLimit({ ...input, now: now + 1 }, storage)).toBe(true)
    expect(await consumeAuthRateLimit({ ...input, now: now + 2 }, storage)).toBe(true)
    expect(await consumeAuthRateLimit({ ...input, now: now + 3 }, storage)).toBe(false)
  })

  it('isolates limits by email and by IP', async () => {
    const now = 3_000_000
    expect(await consumeAuthRateLimit({
      operation: 'signInEmail',
      ip: '203.0.113.10',
      email: 'a@test.local',
      now,
    }, storage)).toBe(true)
    expect(await consumeAuthRateLimit({
      operation: 'signInEmail',
      ip: '203.0.113.10',
      email: 'b@test.local',
      now,
    }, storage)).toBe(true)
    expect(await consumeAuthRateLimit({
      operation: 'signInEmail',
      ip: '203.0.113.11',
      email: 'a@test.local',
      now,
    }, storage)).toBe(true)
  })

  it('treats a missing IP as the unknown fallback key', async () => {
    const now = 4_000_000
    const input = {
      operation: 'signOut',
      ip: 'unknown',
      now,
    } as const

    for (let index = 0; index < 10; index++) {
      expect(await consumeAuthRateLimit({ ...input, now: now + index }, storage)).toBe(true)
    }
    expect(await consumeAuthRateLimit({ ...input, now: now + 10 }, storage)).toBe(false)
  })

  it('enforces a global cap per IP across auth mutations', async () => {
    const now = 5_000_000
    for (let index = 0; index < 100; index++) {
      expect(await consumeAuthRateLimit({
        operation: 'signInEmail',
        ip: '203.0.113.50',
        email: `user-${index}@test.local`,
        now,
      }, storage)).toBe(true)
    }
    expect(await consumeAuthRateLimit({
      operation: 'signInEmail',
      ip: '203.0.113.50',
      email: 'other@test.local',
      now,
    }, storage)).toBe(false)
  })

  it('drops expired buckets so unique emails cannot grow the store forever', async () => {
    const now = 6_000_000
    for (let index = 0; index < 128; index++) {
      expect(await consumeAuthRateLimit({
        operation: 'signInEmail',
        ip: `203.0.113.${index}`,
        email: `retain-${index}@test.local`,
        now,
      }, storage)).toBe(true)
    }
    expect(await authRateLimitEntryCount(storage)).toBeGreaterThanOrEqual(256)

    expect(await consumeAuthRateLimit({
      operation: 'signInEmail',
      ip: '198.51.100.10',
      email: 'after-window@test.local',
      now: now + 60_001,
    }, storage)).toBe(true)
    expect(await authRateLimitEntryCount(storage)).toBeLessThan(8)
  })

  it('treats a non-array stored value as an empty window', async () => {
    const now = 7_000_000
    const tolerant = {
      ...storage,
      getItem: async (key: string) => {
        if (key === 'global:203.0.113.10')
          return 'corrupt'
        return await storage.getItem(key)
      },
    }
    expect(await consumeAuthRateLimit({
      operation: 'signInEmail',
      ip: '203.0.113.10',
      email: 'user@test.local',
      now: now + 1,
    }, tolerant)).toBe(true)
  })
})

export function createMemoryAuthRateLimitStorage(): AuthRateLimitStorage {
  /** Timestamp buckets keyed by limit identity. Mutation is the store's purpose. */
  const hits = new Map<string, readonly number[]>()
  return {
    getItem: async (key) => {
      return hits.get(key) ?? null
    },
    setItem: async (key, value) => {
      hits.set(key, value)
    },
    removeItem: async (key) => {
      hits.delete(key)
    },
    getKeys: async () => {
      return [...hits.keys()]
    },
    clear: async () => {
      hits.clear()
    },
  }
}
