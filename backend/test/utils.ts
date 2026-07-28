import type { TestHelpers } from 'better-auth/plugins'
import { createClient } from '@teages/oh-my-graphql'
import { createFetch } from 'ofetch'
import { useAuth } from '~/server/utils/auth'
import { useDrizzle } from '~/server/utils/drizzle'
import { clearDatabase } from '~/server/utils/pglite-db'

/**
 * Resets the shared e2e database to a pristine state (drops and recreates
 * all tables from the Drizzle schema).
 *
 * Use this in `beforeEach` / `beforeAll` when a test needs a fully clean slate
 * (e.g. counting exact row numbers). Most tests should prefer unique-prefix
 * isolation (`uniqueTodoTitle` / `uniqueAuthEmail`) instead, which is cheaper
 * and safe under the single-worker shared-Nitro model.
 *
 * @requires import.meta.MOCK_DATABASE — only valid in the e2e PGlite environment.
 */
export async function resetTestDatabase(): Promise<void> {
  if (!import.meta.MOCK_DATABASE) {
    throw new Error('resetTestDatabase() is only available in the e2e mock-database environment.')
  }
  const { db } = useDrizzle()
  await clearDatabase(db)
}

/** Unique title prefix for a single test case (safe under shared-worker Vitest). */
export function uniqueTodoTitle(scope: string): string {
  return `todo-${scope}-${crypto.randomUUID()}`
}

/** Unique email for a single auth test case (safe under shared-worker Vitest). */
export function uniqueAuthEmail(scope: string): string {
  return `auth-${scope}-${crypto.randomUUID()}@test.local`
}

export function todosWithTitlePrefix<T extends { title: string }>(
  rows: readonly T[],
  prefix: string,
): T[] {
  return rows.filter(row => row.title.startsWith(prefix))
}

export interface TestAuthSession {
  userId: string
  cookie: string
}

let authTestHelpers: TestHelpers | null = null

/** Better Auth test helpers from the `testUtils()` plugin (`ctx.test`). */
export async function getAuthTestHelpers(): Promise<TestHelpers> {
  authTestHelpers ??= (await useAuth().$context).test
  return authTestHelpers
}

/** Creates a unique test user and session via Better Auth testUtils. */
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

export function createGraphQLTestClient(
  fetch: (req: string | Request | URL, init?: RequestInit) => Promise<Response>,
  options?: { cookie?: string },
) {
  const authedFetch = options?.cookie
    ? (req: string | Request | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers)
        headers.set('Cookie', options.cookie!)
        return fetch(req, { ...init, headers })
      }
    : fetch

  return createClient('http://localhost/graphql', {
    ofetch: createFetch({ fetch: authedFetch }),
  })
}
