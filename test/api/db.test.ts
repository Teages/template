import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { useDrizzle } from '#drizzle'

describe('direct db access in the nitro environment', () => {
  it('executes raw sql via useDrizzle()', async () => {
    const { db } = useDrizzle()
    const result = await db.execute(sql`select 1 as one`) as unknown as { rows: Array<{ one: number }> }
    expect(result.rows).toEqual([{ one: 1 }])
  })
})
