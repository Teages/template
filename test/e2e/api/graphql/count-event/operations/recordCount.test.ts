import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/plugins/graphql-schema/runtime/shared/gazania.ts'
import { createGraphQLTestClient, resetTestDatabase, signInTestUser } from '~/test/utils'

describe('mutation recordCount', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('records a count event for the signed-in user', async () => {
    const auth = await signInTestUser('gql-record')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })

    const res = await client.mutation(
      gazania.mutation('RecordCount')
        .select($ => $.select([{
          recordCount: $ => $.select([
            '__typename',
            {
              '... on RecordCountPayload': $ => $.select([
                'totalCount',
                {
                  countEvent: $ => $.select([
                    'id',
                    'createdAt',
                    { user: $ => $.select(['name', 'email']) },
                  ]),
                },
              ]),
            },
          ]),
        }])),
    )

    expect(res.recordCount.__typename).toBe('RecordCountPayload')
    expect(res.recordCount.countEvent.id).toBeTruthy()
    expect(res.recordCount.countEvent.user.name).toBe('Vitest User')
    expect(res.recordCount.countEvent.createdAt).toBeTruthy()
    expect(res.recordCount.totalCount).toBe(1)
  })

  it('resolves unauthenticated requests with an UnauthorizedError', async () => {
    const unauthenticated = createGraphQLTestClient(serverFetch)
    const res = await unauthenticated.mutation(
      gazania.mutation('RecordCountUnauth')
        .select($ => $.select([{
          recordCount: $ => $.select([
            '__typename',
            { '... on UnauthorizedError': $ => $.select(['message']) },
          ]),
        }])),
    )

    expect(res.recordCount.__typename).toBe('UnauthorizedError')
    expect(res.recordCount.message).toBe('Unauthorized')
  })
})
