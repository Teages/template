import type { DrizzleDatabase } from '~/server/utils/drizzle'
import { TRPCError } from '@trpc/server'
import { and, count, desc, eq, lt, or } from 'drizzle-orm'
import { countEvents, users } from '~/server/database/schema'

export interface CountEventItem {
  readonly id: string
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

export async function listCountEvents(
  db: DrizzleDatabase,
  options: { limit: number, cursor?: string },
) {
  const [cursorRow] = options.cursor
    ? await db
        .select({ id: countEvents.id, createdAt: countEvents.createdAt })
        .from(countEvents)
        .where(eq(countEvents.id, options.cursor))
        .limit(1)
    : []

  if (options.cursor && !cursorRow) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'cursor is invalid',
    })
  }

  const cursorFilter = cursorRow
    ? or(
        lt(countEvents.createdAt, cursorRow.createdAt),
        and(
          eq(countEvents.createdAt, cursorRow.createdAt),
          lt(countEvents.id, cursorRow.id),
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
  const items: CountEventItem[] = pageRows.map(row => ({
    id: row.id,
    userName: row.userName,
    userEmail: row.userEmail,
    createdAt: row.createdAt.toISOString(),
  }))

  return {
    total: totalRow[0]?.value ?? 0,
    items,
    nextCursor: hasNextPage ? items[items.length - 1]!.id : null,
  }
}

export async function createCountEvent(
  db: DrizzleDatabase,
  user: { id: string, name: string, email: string },
) {
  const [created] = await db.insert(countEvents).values({ userId: user.id }).returning()
  if (!created)
    throw new Error('Failed to create count event')

  const [totalRow] = await db.select({ value: count() }).from(countEvents)
  return {
    total: totalRow?.value ?? 0,
    item: {
      id: created.id,
      userName: user.name,
      userEmail: user.email,
      createdAt: created.createdAt.toISOString(),
    } satisfies CountEventItem,
  }
}
