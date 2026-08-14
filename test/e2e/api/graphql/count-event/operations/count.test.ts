import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/plugins/graphql-schema/runtime/shared/gazania.ts'
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
          recordCount: $ => $.select([
            '__typename',
            { '... on RecordCountPayload': $ => $.select([{ countEvent: $ => $.select(['id']) }]) },
          ]),
        }])),
    )

    const res = await client.query(
      gazania.query('CountTotal')
        .select($ => $.select([{
          count: $ => $.select([
            '__typename',
            { '... on QueryCountSuccess': $ => $.select(['data']) },
          ]),
        }])),
    )

    expect(res.count.__typename).toBe('QueryCountSuccess')
    expect(res.count.data).toBe(1)
  })

  it('resolves unauthenticated requests with an UnauthorizedError', async () => {
    const unauthenticated = createGraphQLTestClient(serverFetch)
    const res = await unauthenticated.query(
      gazania.query('CountTotalUnauth')
        .select($ => $.select([{
          count: $ => $.select([
            '__typename',
            { '... on UnauthorizedError': $ => $.select(['message']) },
          ]),
        }])),
    )

    expect(res.count.__typename).toBe('UnauthorizedError')
    expect(res.count.message).toBe('Unauthorized')
  })
})
