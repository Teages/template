import { builder } from '#server/graphql/builder'
import { useDrizzle } from '#server/utils/drizzle'
import { useAuthSession } from '#server/utils/session'

builder.queryFields(t => ({
  todos: t.drizzleConnection({
    type: 'todos',
    resolve: async (query, _root, _args, { event }) => {
      const authSession = useAuthSession(event, 'required')
      const { db } = useDrizzle()
      return db.query.todos.findMany(
        query({
          where: { userId: authSession.user.id },
          orderBy: { createdAt: 'desc' },
        }),
      )
    },
  }),
}))

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('query todos', async () => {
    const { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } = await import('../../../../../test/utils.ts')
    const { serverFetch } = await import('nitro/app')
    const { gazania } = await import('#server/utils/gazania.ts')
    const { useDrizzle } = await import('#server/utils/drizzle.ts')
    const { todos: todosTable } = await import('#server/database/schema.ts')
    const auth = await signInTestUser('gql-list')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })

    it('returns a connection of todos for this test', async () => {
      const prefix = uniqueTodoTitle('gql-list')
      const { db } = useDrizzle()
      await db.insert(todosTable).values([
        { userId: auth.userId, title: `${prefix}-a` },
        { userId: auth.userId, title: `${prefix}-b` },
      ])

      const res = await client.query(
        gazania.query('TodosList')
          .select($ => $.select([{
            todos: $ => $.select([{
              edges: $ => $.select([{
                node: $ => $.select(['id', 'title', 'completed']),
              }]),
            }]),
          }])),
      )

      const titles = (res.todos!.edges ?? [])
        .flatMap(edge => (edge?.node?.title?.startsWith(prefix) ? [edge.node.title] : []))
      expect(titles.sort()).toEqual([`${prefix}-a`, `${prefix}-b`].sort())
    })

    it('rejects unauthenticated requests', async () => {
      const unauthenticated = createGraphQLTestClient(serverFetch)
      await expect(
        unauthenticated.query(
          gazania.query('TodosListUnauth')
            .select($ => $.select([{
              todos: $ => $.select([{
                edges: $ => $.select([{
                  node: $ => $.select(['id']),
                }]),
              }]),
            }])),
        ),
      ).rejects.toThrow(/Unauthorized/)
    })
  })
}
