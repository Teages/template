import { serverFetch } from 'nitro/app'
import { beforeAll, describe, expect, it } from 'vitest'
import { todos as todosTable } from '~/server/database/schema'
import { useDrizzle } from '~/server/utils/drizzle'
import { gazania } from '~/server/utils/gazania'
import { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } from '~/test/utils'

describe('mutation deleteTodo', () => {
  let userId: string
  let client: ReturnType<typeof createGraphQLTestClient>

  beforeAll(async () => {
    const auth = await signInTestUser('gql-delete')
    userId = auth.userId
    client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })
  })

  it('deletes a todo', async () => {
    const title = uniqueTodoTitle('gql-delete')
    const { db } = useDrizzle()
    const [inserted] = await db.insert(todosTable).values({
      userId,
      title,
    }).returning()

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
