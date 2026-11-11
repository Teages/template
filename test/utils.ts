import type { TestHelpers } from 'better-auth/plugins'
import { createClient } from '@teages/oh-my-graphql'
import { getTableName, is, sql, Table } from 'drizzle-orm'
import { serverFetch } from 'nitro'
import { createFetch } from 'ofetch'
import { useDrizzle } from '#drizzle'
import { useAuth } from '~/server/utils/auth'

let serverReady: Promise<void> | null = null

async function ensureTestServerReady(): Promise<void> {
  serverReady ??= (async () => {
    // Route one request through the Nitro request cycle so
    // @teages/nitro-drizzle's startup schema push (awaited by drizzle-gate)
    // finishes before helpers touch useDrizzle() or Better Auth directly.
    const res = await serverFetch('/api/health')
    if (res.status >= 500) {
      throw new Error(`Test server initialization failed with status ${res.status}`)
    }
  })()
  await serverReady
}

export async function resetTestDatabase(): Promise<void> {
  await ensureTestServerReady()
  const { db, schema } = useDrizzle()
  const tables = Object.values(schema)
    .filter(value => is(value, Table))
    .map(table => sql.identifier(getTableName(table)))
  if (tables.length > 0) {
    await db.execute(sql`truncate table ${sql.join(tables, sql.raw(', '))} restart identity cascade`)
  }
}

export function uniqueAuthEmail(scope: string): string {
  return `auth-${scope}-${crypto.randomUUID()}@test.local`
}

export interface TestAuthSession {
  userId: string
  cookie: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTestHelpers(value: unknown): value is TestHelpers {
  return isRecord(value)
    && typeof value.createUser === 'function'
    && typeof value.saveUser === 'function'
    && typeof value.deleteUser === 'function'
    && typeof value.login === 'function'
    && typeof value.getAuthHeaders === 'function'
    && typeof value.getCookies === 'function'
}

let authTestHelpers: TestHelpers | null = null

export async function getAuthTestHelpers(): Promise<TestHelpers> {
  if (!authTestHelpers) {
    await ensureTestServerReady()
    const context = await useAuth().$context as unknown
    if (!isRecord(context) || !isTestHelpers(context.test))
      throw new Error('Better Auth test utilities are not configured')
    authTestHelpers = context.test
  }
  return authTestHelpers
}

export async function signInTestUser(
  scope: string,
  options?: { name?: string },
): Promise<TestAuthSession> {
  const test = await getAuthTestHelpers()
  const user = test.createUser({
    email: uniqueAuthEmail(scope),
    name: options?.name ?? 'Vitest User',
  })
  await test.saveUser(user)
  const { headers, user: savedUser } = await test.login({ userId: user.id })
  const cookie = headers.get('cookie')
  if (!cookie) {
    throw new Error('Expected session cookie from test.login')
  }
  return { userId: savedUser.id, cookie }
}

export function cookieHeader(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() ?? []
  if (setCookies.length > 0) {
    return setCookies.map(c => c.split(';')[0]!).join('; ')
  }
  const legacy = res.headers.get('set-cookie')
  return legacy?.split(',').map(c => c.trim().split(';')[0]!).join('; ') ?? ''
}

export const testOrigin = 'http://localhost:20398'

export const jsonHeaders = {
  'Content-Type': 'application/json',
  'Origin': testOrigin,
} as const

export function createGraphQLTestClient(
  fetch: (req: string | Request | URL, init?: RequestInit) => Promise<Response>,
  options?: { cookie?: string },
) {
  const cookie = options?.cookie
  const authedFetch = cookie
    ? (req: string | Request | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers)
        headers.set('Cookie', cookie)
        return fetch(req, { ...init, headers })
      }
    : fetch

  return createClient('http://localhost/api/graphql', {
    ofetch: createFetch({ fetch: authedFetch }),
  })
}
