import { expect } from 'vitest'
import { useDrizzle } from '#drizzle'
import { GraphQLRequestError } from '#shared/graphql-client'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The Date scalar serializes through `toISOString()`, so output is fixed-width UTC. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

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
