import type { TestHelpers } from 'better-auth/plugins'
import { createClient } from '@teages/oh-my-graphql'
import { createFetch } from 'ofetch'
import { useAuth } from '~/server/utils/auth'

/** Unique title prefix for a single test case (safe under parallel Vitest). */
export function uniqueTodoTitle(scope: string): string {
  return `todo-${scope}-${crypto.randomUUID()}`
}

/** Unique email for a single auth test case (safe under parallel Vitest). */
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
