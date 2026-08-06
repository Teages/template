import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/server/utils/gazania'
import { createGraphQLTestClient, resetTestDatabase, signInTestUser } from '~/test/utils'

describe('query count', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('returns the total number of count events', async () => {
    const auth = await signInTestUser('gql-count')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })

    await client.mutation(
      gazania.mutation('RecordForCountQuery')
        .select($ => $.select([{
          recordCount: $ => $.select(['id']),
        }])),
    )

    const res = await client.query(
      gazania.query('CountTotal')
        .select($ => $.select(['count'])),
    )

    expect(res.count).toBe(1)
  })

  it('rejects unauthenticated requests', async () => {
    const unauthenticated = createGraphQLTestClient(serverFetch)
    await expect(
      unauthenticated.query(
        gazania.query('CountTotalUnauth')
          .select($ => $.select(['count'])),
      ),
    ).rejects.toThrow(/Unauthorized/)
  })
})
