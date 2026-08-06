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
          recordCount: $ => $.select([{
            countEvent: $ => $.select(['id']),
          }]),
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
          recordCount: $ => $.select([{
            countEvent: $ => $.select(['id']),
          }]),
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

    const names = res.countEvents.edges.map(edge => edge.node.user.name)
    expect(names).toEqual(['Second User', 'Vitest User'])
  })

  it('supports Relay forward pagination', async () => {
    const auth = await signInTestUser('gql-page')
    const client = createGraphQLTestClient(serverFetch, { cookie: auth.cookie })
    for (let index = 0; index < 3; index++) {
      await client.mutation(
        gazania.mutation(`RecordForPage${index}`)
          .select($ => $.select([{
            recordCount: $ => $.select([{
              countEvent: $ => $.select(['id']),
            }]),
          }])),
      )
    }

    const first = await client.query(
      gazania.query('FirstCountEventsPage')
        .select($ => $.select([{
          countEvents: $ => $.args({ first: 2 }).select([
            { edges: $ => $.select(['cursor', { node: $ => $.select(['id']) }]) },
            { pageInfo: $ => $.select(['endCursor', 'hasNextPage']) },
          ]),
        }])),
    )
    expect(first.countEvents.edges).toHaveLength(2)
    expect(first.countEvents.pageInfo.hasNextPage).toBe(true)
    expect(first.countEvents.pageInfo.endCursor).toBeTruthy()

    const second = await client.query(
      gazania.query('SecondCountEventsPage')
        .select($ => $.select([{
          countEvents: $ => $.args({
            first: 2,
            after: first.countEvents.pageInfo.endCursor,
          }).select([
            { edges: $ => $.select([{ node: $ => $.select(['id']) }]) },
            { pageInfo: $ => $.select(['hasNextPage']) },
          ]),
        }])),
    )
    expect(second.countEvents.edges).toHaveLength(1)
    expect(second.countEvents.pageInfo.hasNextPage).toBe(false)
    expect(second.countEvents.edges[0]!.node.id).not.toBe(first.countEvents.edges[0]!.node.id)
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
