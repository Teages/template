import { count } from 'drizzle-orm'
import { useDrizzle } from '#drizzle'
import * as schema from '~/server/database/schema'
import { builder } from '~/server/graphql/builder'
import { requireAuthSession, UnauthorizedError } from '~/server/graphql/errors'
import { CountEvent } from '../CountEvent'

const RecordCountPayload = builder.simpleObject('RecordCountPayload', {
  fields: t => ({
    countEvent: t.field({ type: CountEvent }),
    totalCount: t.int(),
  }),
})

builder.mutationFields(t => ({
  recordCount: t.field({
    type: RecordCountPayload,
    errors: { types: [UnauthorizedError], directResult: true },
    resolve: async (_root, _args, { event }) => {
      const authSession = requireAuthSession(event)
      const { db } = useDrizzle()
      const [created] = await db.insert(schema.countEvents).values({
        userId: authSession.user.id,
      }).returning()
      if (!created)
        throw new Error('Failed to record count event')
      const [total] = await db
        .select({ value: count() })
        .from(schema.countEvents)
      return {
        countEvent: created,
        totalCount: total?.value ?? 0,
      }
    },
  }),
}))
