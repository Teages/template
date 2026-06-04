import { and, eq } from 'drizzle-orm'
import { schema } from '~/server/database/index'
import { builder } from '~/server/graphql/builder'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'
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

      const { db } = useDrizzle()
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

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('mutation updateTodo', async () => {
    const { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } = await import('~/test/utils.ts')
    const { serverFetch } = await import('nitro/app')
    const { gazania } = await import('~/server/utils/gazania.ts')
    const { useDrizzle } = await import('~/server/utils/drizzle.ts')
    const { todos: todosTable } = await import('~/server/database/schema.ts')
    const auth = await signInTestUser('gql-update')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })

    it('updates completed', async () => {
      const title = uniqueTodoTitle('gql-update')
      const { db } = useDrizzle()
      const [inserted] = await db.insert(todosTable).values({
        userId: auth.userId,
        title,
      }).returning()

      const res = await client.mutation(
        gazania.mutation('UpdateTodo')
          .vars({ input: 'UpdateTodoInput!' })
          .select(($, vars) => $.select([{
            updateTodo: $ => $.args({ input: vars.input }).select(['id', 'completed']),
          }])),
        { input: { id: inserted.id, title: undefined, completed: true } },
      )

      expect(res.updateTodo!.completed).toBe(true)
    })
  })
}
