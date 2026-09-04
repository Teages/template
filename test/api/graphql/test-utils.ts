import { expect } from 'vitest'
import { useDrizzle } from '#drizzle'
import { useAuth } from '#server/utils/auth'
import { GraphQLRequestError } from '#shared/graphql-client'

/** Shared test password; Better Auth requires at least 8 characters. */
export const TEST_PASSWORD = 'password-8-chars'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The Date scalar serializes through `toISOString()`, so output is fixed-width UTC. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export function expectIsoDateString(value: string | null | undefined): void {
  expect(value).toEqual(expect.stringMatching(ISO_DATE_PATTERN))
}

export interface SessionUser {
  userId: string
  /** Cookie header value authenticating requests for this user's session. */
  cookie: string
}

/**
 * Creates a user with a live session by calling Better Auth's server API
 * directly. The returned cookie can be passed to `requestGraphQL()` as the
 * `cookie` header; omitting it exercises the unauthenticated path.
 */
export async function createSessionUser(scope: string): Promise<SessionUser> {
  const auth = useAuth()
  const email = `gql-${scope}-${crypto.randomUUID()}@test.local`
  const { headers, response } = await auth.api.signUpEmail({
    body: {
      name: 'GraphQL Test User',
      email,
      password: TEST_PASSWORD,
    },
    returnHeaders: true,
  })

  const cookie = headers
    .getSetCookie()
    .map(setCookie => setCookie.slice(0, setCookie.indexOf(';')))
    .join('; ')

  return { userId: response.user.id, cookie }
}

export interface SeedTodo {
  userId: string
  title: string
  completed?: boolean
  /** Explicit timestamp — set it when a test depends on ordering. */
  createdAt?: Date
}

/** Inserts a todo row directly, bypassing the GraphQL layer. */
export async function seedTodo(seed: SeedTodo) {
  const { db, schema } = useDrizzle()
  const [todo] = await db.insert(schema.todos).values({
    userId: seed.userId,
    title: seed.title,
    completed: seed.completed ?? false,
    createdAt: seed.createdAt,
  }).returning()
  if (!todo) {
    throw new Error('Seeding a todo returned no row.')
  }
  return todo
}

/** Asserts that a request fails on the auth boundary with an `Unauthorized` GraphQL error. */
export async function expectUnauthorizedError(promise: Promise<unknown>): Promise<void> {
  const cause: unknown = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  expect(cause).toBeInstanceOf(GraphQLRequestError)
  if (cause instanceof GraphQLRequestError) {
    expect(cause.errors.some(error => error.message.includes('Unauthorized'))).toBe(true)
  }
}
