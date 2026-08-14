import { count } from 'drizzle-orm'
import { schema } from '~/server/database/index'
import { builder } from '~/server/graphql/builder'
import { requireAuthSession, UnauthorizedError } from '~/server/graphql/errors'
import { useDrizzle } from '~/server/utils/drizzle'

builder.queryFields(t => ({
  // Scalar fields cannot use directResult, so the union carries a
  // QueryCountSuccess wrapper with a `data` field.
  count: t.int({
    errors: { types: [UnauthorizedError] },
    resolve: async (_root, _args, { event }) => {
      requireAuthSession(event)
      const { db } = useDrizzle()
      const [row] = await db
        .select({ value: count() })
        .from(schema.countEvents)
      return row?.value ?? 0
    },
  }),
}))
