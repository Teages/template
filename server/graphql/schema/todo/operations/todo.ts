import { useDrizzle } from '#drizzle'
import { builder } from '#server/graphql/builder'
import { useAuthSession } from '#server/utils/session'

builder.queryFields(t => ({
  todo: t.drizzleField({
    type: 'todos',
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (query, _root, args, { event }) => {
      const authSession = useAuthSession(event, 'required')
      const { db } = useDrizzle()
      return await db.query.todos.findFirst(
        query({ where: { id: args.id, userId: authSession.user.id } }),
      )
    },
  }),
}))
