import type { DrizzleDatabase } from '~/server/utils/drizzle/shared'
import { describe, expect, it, vi } from 'vitest'
import { countEvents, users } from '~/server/database/schema'
import { initDevDrizzle, prepareDevDrizzle, resetDatabase } from '~/server/utils/drizzle/dev'

const userId = 'drizzle-dev-test-user'

async function seedRow(db: DrizzleDatabase): Promise<void> {
  await db.insert(users).values({
    id: userId,
    name: 'Drizzle Dev Test',
    email: 'drizzle.dev.test@example.com',
  })
  await db.insert(countEvents).values({ userId })
}

describe('drizzle dev database', () => {
  it('applies the schema and exposes the prepared instance', async () => {
    const db = await prepareDevDrizzle()

    await expect(seedRow(db)).resolves.toBeUndefined()
    expect(initDevDrizzle()).toBe(db)
  }, 30_000)

  it('drops rows but keeps the schema on resetDatabase', async () => {
    const db = await prepareDevDrizzle()
    await seedRow(db)

    const afterReset = await resetDatabase()

    expect(afterReset).toBe(db)
    expect(await db.query.users.findMany()).toEqual([])
    expect(await db.query.countEvents.findMany()).toEqual([])
    // Schema is re-applied, so inserts keep working after the reset.
    await expect(seedRow(db)).resolves.toBeUndefined()
  }, 30_000)

  it('prepares a fresh database when reset runs before prepare', async () => {
    vi.resetModules()
    const dev = await import('~/server/utils/drizzle/dev')

    const db = await dev.resetDatabase()

    expect(dev.initDevDrizzle()).toBe(db)
    await expect(seedRow(db)).resolves.toBeUndefined()
  }, 30_000)
})
