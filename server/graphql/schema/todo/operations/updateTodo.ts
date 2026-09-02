import { and, eq } from 'drizzle-orm'
import { useDrizzle } from '#drizzle'
import { builder } from '#server/graphql/builder'
import { useAuthSession } from '#server/utils/session'
import { Todo } from '../Todo'

const UpdateTodoInput = builder.inputType('UpdateTodoInput', {
  fields: t => ({
    id: t.id({ required: true }),
    title: t.string({ required: false }),
    completed: t.boolean({ required: false }),
  }),
})

builder.mutationFields(t => ({
  updateTodo: t.field({
    type: Todo,
    nullable: true,
    args: {
      input: t.arg({ type: UpdateTodoInput, required: true }),
    },
    resolve: async (_root, args, { event }) => {
      const { db, schema } = useDrizzle()

      if (args.input.title === undefined && args.input.completed === undefined)
        return null

      const authSession = useAuthSession(event, 'required')
      const patch: Partial<typeof schema.todos.$inferInsert> = {
        updatedAt: new Date(),
      }
      if (args.input.title !== undefined && args.input.title !== null)
        patch.title = args.input.title.trim()
      if (args.input.completed !== undefined && args.input.completed !== null)
        patch.completed = args.input.completed

      const [todo] = await db
        .update(schema.todos)
        .set(patch)
        .where(and(
          eq(schema.todos.id, args.input.id),
          eq(schema.todos.userId, authSession.user.id),
        ))
        .returning()

      return todo ?? null
    },
  }),
}))
