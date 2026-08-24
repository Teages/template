import { useDrizzle } from '@teages/nitro-drizzle/runtime'
import { builder } from '~/server/graphql/builder'
import { requireAuthSession, UnauthorizedError } from '~/server/graphql/errors'

builder.queryFields(t => ({
  countEvents: t.drizzleConnection({
    type: 'countEvents',
    errors: { types: [UnauthorizedError], directResult: true },
    resolve: async (query, _root, _args, { event }) => {
      requireAuthSession(event)
      const { db } = useDrizzle()
      return await db.query.countEvents.findMany(
        query({
          orderBy: { createdAt: 'desc', id: 'desc' },
        }),
      )
    },
  }),
}))
