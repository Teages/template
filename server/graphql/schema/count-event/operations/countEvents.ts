import { builder } from '~/server/graphql/builder'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'

builder.queryFields(t => ({
  countEvents: t.drizzleConnection({
    type: 'countEvents',
    resolve: async (query, _root, _args, { event }) => {
      useAuthSession(event, 'required')
      const { db } = useDrizzle()
      return db.query.countEvents.findMany(
        query({
          orderBy: { createdAt: 'desc' },
        }),
      )
    },
  }),
}))
