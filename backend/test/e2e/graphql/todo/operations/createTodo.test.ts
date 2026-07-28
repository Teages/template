import { serverFetch } from 'nitro/app'
import { beforeAll, describe, expect, it } from 'vitest'
import { gazania } from '~/server/utils/gazania'
import { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } from '~/test/utils'

describe('mutation createTodo', () => {
  let client: ReturnType<typeof createGraphQLTestClient>

  beforeAll(async () => {
    const auth = await signInTestUser('gql-create')
    client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })
  })

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
