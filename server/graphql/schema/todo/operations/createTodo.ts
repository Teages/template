import { schema } from '#server/database/index'
import { builder } from '#server/graphql/builder'
import { useDrizzle } from '#server/utils/drizzle'
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
      const { db } = useDrizzle()

      const [todo] = await db.insert(schema.todos).values({
        userId: authSession.user.id,
        title: args.input.title.trim(),
      }).returning()
      return todo
    },
  }),
}))

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('mutation createTodo', async () => {
    const { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } = await import('../../../../../test/utils.ts')
    const { serverFetch } = await import('nitro/app')
    const { gazania } = await import('#server/utils/gazania.ts')
    const auth = await signInTestUser('gql-create')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })

    it('creates a todo', async () => {
      const title = uniqueTodoTitle('gql-create')
      const res = await client.mutation(
        gazania.mutation('CreateTodo')
          .vars({ input: 'CreateTodoInput!' })
          .select(($, vars) => $.select([{
            createTodo: $ => $.args({ input: vars.input }).select(['id', 'title', 'completed']),
          }])),
        { input: { title } },
      )

      expect(res.createTodo!.title).toBe(title)
      expect(res.createTodo!.completed).toBe(false)
    })
  })
}
