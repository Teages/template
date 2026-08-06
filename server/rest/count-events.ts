import type { DrizzleDatabase } from '~/server/utils/drizzle'
import { Buffer } from 'node:buffer'
import { and, count, desc, eq, lt, or } from 'drizzle-orm'
import { countEvents, users } from '~/server/database/schema'

export interface CountEventResource {
  readonly id: string
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

export interface CountEventPage {
  readonly data: readonly CountEventResource[]
  readonly meta: {
    readonly total: number
    readonly nextCursor: string | null
  }
}

interface CursorValue {
  readonly id: string
  readonly createdAt: string
}

function encodeCursor(event: CountEventResource): string {
  return Buffer.from(JSON.stringify({
    id: event.id,
    createdAt: event.createdAt,
  } satisfies CursorValue)).toString('base64url')
}

export function decodeCursor(value: string): CursorValue {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString())
    if (
      typeof parsed !== 'object'
      || parsed === null
      || !('id' in parsed)
      || !('createdAt' in parsed)
      || typeof parsed.id !== 'string'
      || typeof parsed.createdAt !== 'string'
      || Number.isNaN(new Date(parsed.createdAt).getTime())
    ) {
      throw new Error('Invalid cursor')
    }
    return { id: parsed.id, createdAt: parsed.createdAt }
  }
  catch {
    throw new Error('Invalid cursor')
  }
}

export async function listCountEvents(
  db: DrizzleDatabase,
  options: { limit: number, cursor?: CursorValue },
): Promise<CountEventPage> {
  const cursorDate = options.cursor && new Date(options.cursor.createdAt)
  const cursorFilter = options.cursor && cursorDate
    ? or(
        lt(countEvents.createdAt, cursorDate),
        and(
          eq(countEvents.createdAt, cursorDate),
          lt(countEvents.id, options.cursor.id),
        ),
      )
    : undefined

  const [totalRow, rows] = await Promise.all([
    db.select({ value: count() }).from(countEvents),
    db
      .select({
        id: countEvents.id,
        userName: users.name,
        userEmail: users.email,
        createdAt: countEvents.createdAt,
      })
      .from(countEvents)
      .innerJoin(users, eq(countEvents.userId, users.id))
      .where(cursorFilter)
      .orderBy(desc(countEvents.createdAt), desc(countEvents.id))
      .limit(options.limit + 1),
  ])

  const hasNextPage = rows.length > options.limit
  const pageRows = hasNextPage ? rows.slice(0, options.limit) : rows
  const data = pageRows.map(row => ({
    id: row.id,
    userName: row.userName,
    userEmail: row.userEmail,
    createdAt: row.createdAt.toISOString(),
  }))

  return {
    data,
    meta: {
      total: totalRow[0]?.value ?? 0,
      nextCursor: hasNextPage && data.length > 0
        ? encodeCursor(data[data.length - 1]!)
        : null,
    },
  }
}

export async function createCountEvent(
  db: DrizzleDatabase,
  user: { id: string, name: string, email: string },
): Promise<CountEventResource> {
  const [created] = await db.insert(countEvents).values({ userId: user.id }).returning()
  if (!created)
    throw new Error('Failed to create count event')

  return {
    id: created.id,
    userName: user.name,
    userEmail: user.email,
    createdAt: created.createdAt.toISOString(),
  }
}
