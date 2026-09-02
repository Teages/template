import { and, eq } from 'drizzle-orm'
import { useDrizzle } from '#drizzle'
import { builder } from '#server/graphql/builder'
import { useAuthSession } from '#server/utils/session'

const DeleteTodoInput = builder.inputType('DeleteTodoInput', {
  fields: t => ({
    id: t.id({ required: true }),
  }),
})

const DeleteTodoPayload = builder.simpleObject('DeleteTodoPayload', {
  fields: t => ({
    success: t.boolean(),
    id: t.id({ nullable: true }),
  }),
})

builder.mutationFields(t => ({
  deleteTodo: t.field({
    type: DeleteTodoPayload,
    nullable: true,
    args: {
      input: t.arg({ type: DeleteTodoInput, required: true }),
    },
    resolve: async (_root, args, { event }) => {
      const authSession = useAuthSession(event, 'required')
      const { db, schema } = useDrizzle()
      const [deleted] = await db
        .delete(schema.todos)
        .where(and(
          eq(schema.todos.id, args.input.id),
          eq(schema.todos.userId, authSession.user.id),
        ))
        .returning()

      if (!deleted)
        return null

      return { success: true, id: deleted.id }
    },
  }),
}))
