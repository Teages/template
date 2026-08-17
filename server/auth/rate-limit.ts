export const AUTH_RATE_LIMIT_MOUNT = 'better-auth:rate-limit' as const

export const AUTH_RATE_LIMIT_OPERATIONS = [
  'signInEmail',
  'signUpEmail',
  'signOut',
] as const

export type AuthRateLimitOperation = (typeof AUTH_RATE_LIMIT_OPERATIONS)[number]

export interface AuthRateLimitStorage {
  getItem: (key: string) => Promise<unknown>
  setItem: (key: string, value: readonly number[]) => Promise<void>
  removeItem: (key: string) => Promise<void>
  getKeys: () => Promise<string[]>
  clear: () => Promise<void>
}

interface RateLimitRule {
  readonly max: number
  readonly windowMs: number
}

const OPERATION_RULES = {
  signInEmail: { max: 3, windowMs: 10_000 },
  signUpEmail: { max: 3, windowMs: 10_000 },
  signOut: { max: 10, windowMs: 60_000 },
} as const satisfies Record<AuthRateLimitOperation, RateLimitRule>

const GLOBAL_RULE = { max: 100, windowMs: 10_000 } as const
const LONGEST_WINDOW_MS = 60_000
const PRUNE_AFTER_KEYS = 256

export interface ConsumeAuthRateLimitInput {
  readonly operation: AuthRateLimitOperation
  readonly ip: string
  readonly email?: string
  readonly now?: number
}

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

export async function resetAuthRateLimits(storage: AuthRateLimitStorage): Promise<void> {
  await storage.clear()
}

export async function authRateLimitEntryCount(storage: AuthRateLimitStorage): Promise<number> {
  const keys = await storage.getKeys()
  return keys.length
}

export async function consumeAuthRateLimit(
  input: ConsumeAuthRateLimitInput,
  storage: AuthRateLimitStorage,
): Promise<boolean> {
  const now = input.now ?? Date.now()
  const keys = await storage.getKeys()
  if (keys.length >= PRUNE_AFTER_KEYS)
    await pruneExpired(storage, now)

  const ip = input.ip || 'unknown'
  const operationKey = input.email === undefined
    ? `${input.operation}:${ip}`
    : `${input.operation}:${ip}:${input.email.toLowerCase()}`
  const globalKey = `global:${ip}`

  if (!await accept(storage, operationKey, now, OPERATION_RULES[input.operation]))
    return false
  if (!await accept(storage, globalKey, now, GLOBAL_RULE))
    return false
  return true
}

async function accept(
  storage: AuthRateLimitStorage,
  key: string,
  now: number,
  rule: RateLimitRule,
): Promise<boolean> {
  const windowStart = now - rule.windowMs
  const recent = readTimestamps(await storage.getItem(key))
    .filter(timestamp => timestamp > windowStart)
  if (recent.length >= rule.max) {
    await storage.setItem(key, recent)
    return false
  }
  await storage.setItem(key, [...recent, now])
  return true
}

async function pruneExpired(storage: AuthRateLimitStorage, now: number): Promise<void> {
  const keys = await storage.getKeys()
  await Promise.all(keys.map(async (key) => {
    const recent = readTimestamps(await storage.getItem(key))
      .filter(timestamp => now - timestamp < LONGEST_WINDOW_MS)
    if (recent.length === 0)
      await storage.removeItem(key)
    else
      await storage.setItem(key, recent)
  }))
}

function readTimestamps(value: unknown): number[] {
  if (!Array.isArray(value))
    return []
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}
