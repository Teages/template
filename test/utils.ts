import type { TestHelpers } from 'better-auth/plugins'
import { createClient } from '@teages/oh-my-graphql'
import { serverFetch } from 'nitro/app'
import { createFetch } from 'ofetch'
import { useAuth } from '~/server/utils/auth'
import { useDrizzle } from '~/server/utils/drizzle'
import { clearDatabase } from '~/server/utils/pglite-db'

export async function resetTestDatabase(): Promise<void> {
  if (!import.meta.MOCK_DATABASE) {
    throw new Error('resetTestDatabase() is only available in the mock-database test environment.')
  }
  // The request hook waits for the asynchronous PGlite plugin initialization.
  await serverFetch('/api/auth/get-session')
  const { db } = useDrizzle()
  await clearDatabase(db)
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
    const context = await useAuth().$context as unknown
    if (!isRecord(context) || !isTestHelpers(context.test))
      throw new Error('Better Auth test utilities are not configured')
    authTestHelpers = context.test
  }
  return authTestHelpers
}

export async function signInTestUser(scope: string): Promise<TestAuthSession> {
  const test = await getAuthTestHelpers()
  const user = test.createUser({
    email: uniqueAuthEmail(scope),
    name: 'Vitest User',
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
