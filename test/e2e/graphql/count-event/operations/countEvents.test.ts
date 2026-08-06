import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/server/utils/gazania'
import {
  cookieHeader,
  createGraphQLTestClient,
  jsonHeaders,
  resetTestDatabase,
  signInTestUser,
  uniqueAuthEmail,
} from '~/test/utils'

describe('query countEvents', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('returns events with user relation in reverse chronological order', async () => {
    const first = await signInTestUser('gql-events-a')
    const firstClient = createGraphQLTestClient(serverFetch, { cookie: first.cookie })
    await firstClient.mutation(
      gazania.mutation('RecordForEventsA')
        .select($ => $.select([{
          recordCount: $ => $.select(['id']),
        }])),
    )

    const email = uniqueAuthEmail('gql-events-b')
    const signUpRes = await serverFetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: 'Second User',
        email,
        password: 'password-8-chars',
      }),
    })
    expect(signUpRes.status).toBe(200)
    const secondCookie = cookieHeader(signUpRes)
    const secondClient = createGraphQLTestClient(serverFetch, { cookie: secondCookie })
    await secondClient.mutation(
      gazania.mutation('RecordForEventsB')
        .select($ => $.select([{
          recordCount: $ => $.select(['id']),
        }])),
    )

    const res = await secondClient.query(
      gazania.query('CountEventsList')
        .select($ => $.select([{
          countEvents: $ => $.select([{
            edges: $ => $.select([{
              node: $ => $.select([
                'id',
                { user: $ => $.select(['name', 'email']) },
              ]),
            }]),
          }]),
        }])),
    )

    const names = (res.countEvents?.edges ?? [])
      .map(edge => edge?.node?.user?.name)
      .filter((name): name is string => typeof name === 'string')
    expect(names).toEqual(['Second User', 'Vitest User'])
  })

  it('rejects unauthenticated requests', async () => {
    const unauthenticated = createGraphQLTestClient(serverFetch)
    await expect(
      unauthenticated.query(
        gazania.query('CountEventsListUnauth')
          .select($ => $.select([{
            countEvents: $ => $.select([{
              edges: $ => $.select([{
                node: $ => $.select(['id']),
              }]),
            }]),
          }])),
      ),
    ).rejects.toThrow(/Unauthorized/)
  })
})
