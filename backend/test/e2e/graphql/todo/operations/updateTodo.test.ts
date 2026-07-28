import { serverFetch } from 'nitro/app'
import { beforeAll, describe, expect, it } from 'vitest'
import { todos as todosTable } from '~/server/database/schema'
import { useDrizzle } from '~/server/utils/drizzle'
import { gazania } from '~/server/utils/gazania'
import { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } from '~/test/utils'

describe('mutation updateTodo', () => {
  let userId: string
  let client: ReturnType<typeof createGraphQLTestClient>

  beforeAll(async () => {
    const auth = await signInTestUser('gql-update')
    userId = auth.userId
    client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })
  })

  it('updates completed', async () => {
    const title = uniqueTodoTitle('gql-update')
    const { db } = useDrizzle()
    const [inserted] = await db.insert(todosTable).values({
      userId,
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
