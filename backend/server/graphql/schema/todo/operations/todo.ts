import { builder } from '~/server/graphql/builder'
import { useDrizzle } from '~/server/utils/drizzle'
import { useAuthSession } from '~/server/utils/session'

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
      return db.query.todos.findFirst(
        query({ where: { id: args.id, userId: authSession.user.id } }),
      )
    },
  }),
}))

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('query todo', async () => {
    const { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } = await import('~/test/utils.ts')
    const { serverFetch } = await import('nitro/app')
    const { gazania } = await import('~/server/utils/gazania.ts')
    const { useDrizzle } = await import('~/server/utils/drizzle.ts')
    const { todos: todosTable } = await import('~/server/database/schema.ts')
    const auth = await signInTestUser('gql-get')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })

    it('returns a todo by id', async () => {
      const title = uniqueTodoTitle('gql-get')
      const { db } = useDrizzle()
      const [inserted] = await db.insert(todosTable).values({
        userId: auth.userId,
        title,
      }).returning()

      const res = await client.query(
        gazania.query('TodoById')
          .vars({ id: 'ID!' })
          .select(($, vars) => $.select([{
            todo: $ => $.args({ id: vars.id }).select(['id', 'title', 'completed']),
          }])),
        { id: inserted.id },
      )

      expect(res.todo!.id).toBe(inserted.id)
      expect(res.todo!.title).toBe(title)
    })

    it('returns null for a missing id', async () => {
      const res = await client.query(
        gazania.query('TodoMissing')
          .vars({ id: 'ID!' })
          .select(($, vars) => $.select([{
            todo: $ => $.args({ id: vars.id }).select(['id']),
          }])),
        { id: '00000000-0000-0000-0000-000000000000' },
      )

      expect(res.todo).toBeNull()
    })
  })
}
