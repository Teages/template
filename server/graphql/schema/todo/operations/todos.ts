import { useDrizzle } from '#drizzle'
import { builder } from '#server/graphql/builder'
import { useAuthSession } from '#server/utils/session'

builder.queryFields(t => ({
  todos: t.drizzleConnection({
    type: 'todos',
    resolve: async (query, _root, _args, { event }) => {
      const authSession = useAuthSession(event, 'required')
      const { db } = useDrizzle()
      return await db.query.todos.findMany(
        query({
          where: { userId: authSession.user.id },
          orderBy: { createdAt: 'desc' },
        }),
      )
    },
  }),
}))
