import { useDrizzle } from '#drizzle'
import { builder } from '#server/graphql/builder'
import { useAuthSession } from '#server/utils/session'
import { Todo } from '../Todo'

const CreateTodoInput = builder.inputType('CreateTodoInput', {
  fields: t => ({
    title: t.string({ required: true }),
  }),
})

builder.mutationFields(t => ({
  createTodo: t.field({
    type: Todo,
    args: {
      input: t.arg({ type: CreateTodoInput, required: true }),
    },
    resolve: async (_root, args, { event }) => {
      const authSession = useAuthSession(event, 'required')
      const { db, schema } = useDrizzle()

      const [todo] = await db.insert(schema.todos).values({
        userId: authSession.user.id,
        title: args.input.title.trim(),
      }).returning()
      return todo
    },
  }),
}))
