import { schema } from '~/server/database/index'
import { builder } from '~/server/graphql/builder'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'
import { CountEvent } from '../CountEvent'

builder.mutationFields(t => ({
  recordCount: t.field({
    type: CountEvent,
    resolve: async (_root, _args, { event }) => {
      const authSession = useAuthSession(event, 'required')
      const { db } = useDrizzle()
      const [created] = await db.insert(schema.countEvents).values({
        userId: authSession.user.id,
      }).returning()
      if (!created)
        throw new Error('Failed to record count event')
      return created
    },
  }),
}))
