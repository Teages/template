import { and, eq } from 'drizzle-orm'
import { schema } from '#server/database/index'
import { builder } from '#server/graphql/builder'
import { useDrizzle } from '#server/utils/drizzle'
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
      const { db } = useDrizzle()
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

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('mutation deleteTodo', async () => {
    const { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } = await import('../../../../../test/utils.ts')
    const { serverFetch } = await import('nitro/app')
    const { gazania } = await import('#server/utils/gazania.ts')
    const { useDrizzle } = await import('#server/utils/drizzle.ts')
    const { todos: todosTable } = await import('#server/database/schema.ts')
    const auth = await signInTestUser('gql-delete')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })

    it('deletes a todo', async () => {
      const title = uniqueTodoTitle('gql-delete')
      const { db } = useDrizzle()
      const inserted = (await db.insert(todosTable).values({
        userId: auth.userId,
        title,
      }).returning())[0]
      if (!inserted) throw new Error('insert did not return a row')

      const res = await client.mutation(
        gazania.mutation('DeleteTodo')
          .vars({ input: 'DeleteTodoInput!' })
          .select(($, vars) => $.select([{
            deleteTodo: $ => $.args({ input: vars.input }).select(['success', 'id']),
          }])),
        { input: { id: inserted.id } },
      )

      expect(res.deleteTodo!.success).toBe(true)
      expect(res.deleteTodo!.id).toBe(inserted.id)

      const missing = await db.query.todos.findFirst({ where: { id: inserted.id } })
      expect(missing).toBeUndefined()
    })
  })
}
