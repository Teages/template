import type { DrizzleDatabase } from './drizzle'
import { desc, eq } from 'drizzle-orm'
import { countEvents, users } from '../database/schema'

export interface CountEventRecord {
  readonly id: string
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

export interface CountSnapshot {
  readonly count: number
  readonly events: readonly CountEventRecord[]
}

export async function getCountSnapshot(db: DrizzleDatabase): Promise<CountSnapshot> {
  const rows = await db
    .select({
      id: countEvents.id,
      userName: users.name,
      userEmail: users.email,
      createdAt: countEvents.createdAt,
    })
    .from(countEvents)
    .innerJoin(users, eq(countEvents.userId, users.id))
    .orderBy(desc(countEvents.createdAt))

  const events: CountEventRecord[] = rows.map(row => ({
    id: row.id,
    userName: row.userName,
    userEmail: row.userEmail,
    createdAt: row.createdAt.toISOString(),
  }))

  return {
    count: events.length,
    events,
  }
}

export async function recordCountEvent(
  db: DrizzleDatabase,
  userId: string,
): Promise<CountSnapshot> {
  await db.insert(countEvents).values({ userId })
  return getCountSnapshot(db)
}
