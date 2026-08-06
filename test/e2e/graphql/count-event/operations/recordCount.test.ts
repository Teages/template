import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/server/utils/gazania'
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
            'id',
            'createdAt',
            { user: $ => $.select(['name', 'email']) },
          ]),
        }])),
    )

    expect(res.recordCount?.id).toBeTruthy()
    expect(res.recordCount?.user?.name).toBe('Vitest User')
    expect(res.recordCount?.createdAt).toBeTruthy()
  })

  it('rejects unauthenticated requests', async () => {
    const unauthenticated = createGraphQLTestClient(serverFetch)
    await expect(
      unauthenticated.mutation(
        gazania.mutation('RecordCountUnauth')
          .select($ => $.select([{
            recordCount: $ => $.select(['id']),
          }])),
      ),
    ).rejects.toThrow(/Unauthorized/)
  })
})
