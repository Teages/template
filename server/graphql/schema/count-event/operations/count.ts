import { count } from 'drizzle-orm'
import { schema } from '~/server/database/index'
import { builder } from '~/server/graphql/builder'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'

builder.queryFields(t => ({
  count: t.int({
    resolve: async (_root, _args, { event }) => {
      useAuthSession(event, 'required')
      const { db } = useDrizzle()
      const [row] = await db
        .select({ value: count() })
        .from(schema.countEvents)
      return row?.value ?? 0
    },
  }),
}))
