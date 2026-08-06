import { count } from 'drizzle-orm'
import { schema } from '~/server/database/index'
import { builder } from '~/server/graphql/builder'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'
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
    resolve: async (_root, _args, { event }) => {
      const authSession = useAuthSession(event, 'required')
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
