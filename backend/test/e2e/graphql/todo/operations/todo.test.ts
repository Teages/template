import { serverFetch } from 'nitro/app'
import { beforeAll, describe, expect, it } from 'vitest'
import { todos as todosTable } from '~/server/database/schema'
import { useDrizzle } from '~/server/utils/drizzle'
import { gazania } from '~/server/utils/gazania'
import { createGraphQLTestClient, signInTestUser, uniqueTodoTitle } from '~/test/utils'

describe('query todo', () => {
  let userId: string
  let client: ReturnType<typeof createGraphQLTestClient>

  beforeAll(async () => {
    const auth = await signInTestUser('gql-get')
    userId = auth.userId
    client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })
  })

  it('returns a todo by id', async () => {
    const title = uniqueTodoTitle('gql-get')
    const { db } = useDrizzle()
    const [inserted] = await db.insert(todosTable).values({
      userId,
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
