import { serverFetch } from 'nitro/app'
import { beforeAll, describe, expect, it } from 'vitest'
import { todos as todosTable } from '~/server/database/schema'
import { useDrizzle } from '~/server/utils/drizzle'
import { gazania } from '~/server/utils/gazania'
import { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } from '~/test/utils'

describe('query todos', () => {
  let userId: string
  let client: ReturnType<typeof createGraphQLTestClient>

  beforeAll(async () => {
    const auth = await signInTestUser('gql-list')
    userId = auth.userId
    client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })
  })

  it('returns a connection of todos for this test', async () => {
    const prefix = uniqueTodoTitle('gql-list')
    const { db } = useDrizzle()
    await db.insert(todosTable).values([
      { userId, title: `${prefix}-a` },
      { userId, title: `${prefix}-b` },
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
