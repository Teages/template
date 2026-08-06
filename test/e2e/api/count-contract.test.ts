import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/server/utils/gazania'
import {
  createGraphQLTestClient,
  createTRPCTestClient,
  resetTestDatabase,
  signInTestUser,
} from '~/test/utils'

describe('count API business contract', () => {
  beforeEach(async () => {
    await serverFetch('/api/auth/get-session')
    await resetTestDatabase()
  })

  it('keeps REST, GraphQL, and tRPC business results aligned', async () => {
    const { cookie } = await signInTestUser('count-contract')
    const headers = { Cookie: cookie }
    const graphql = createGraphQLTestClient(serverFetch, { cookie })
    const trpc = createTRPCTestClient(serverFetch, { cookie })

    const restCreate = await serverFetch('/api/count-events', {
      method: 'POST',
      headers,
    })
    expect(restCreate.status).toBe(201)

    await graphql.mutation(
      gazania.mutation('CreateCountEventForContract')
        .select($ => $.select([{
          recordCount: $ => $.select([{
            countEvent: $ => $.select(['id']),
          }]),
        }])),
    )
    await trpc.count.create.mutate()

    const rest = await serverFetch('/api/count-events?limit=10', { headers })
      .then(response => response.json()) as {
      data: Array<{ id: string, userName: string }>
      meta: { total: number }
    }
    const graph = await graphql.query(
      gazania.query('ReadCountEventsForContract')
        .select($ => $.select([
          'count',
          {
            countEvents: $ => $.args({ first: 10 }).select([{
              edges: $ => $.select([{
                node: $ => $.select(['id', { user: $ => $.select(['name']) }]),
              }]),
            }]),
          },
        ])),
    )
    const rpc = await trpc.count.list.query({ limit: 10 })

    expect(rest.meta.total).toBe(3)
    expect(graph.count).toBe(3)
    expect(rpc.total).toBe(3)

    const restIds = rest.data.map(event => event.id)
    const graphIds = graph.countEvents.edges.map(edge => String(edge.node.id))
    const rpcIds = rpc.items.map(event => event.id)
    expect(graphIds).toEqual(restIds)
    expect(rpcIds).toEqual(restIds)

    expect(rest.data.every(event => event.userName === 'Vitest User')).toBe(true)
    expect(graph.countEvents.edges.every(edge => edge.node.user.name === 'Vitest User')).toBe(true)
    expect(rpc.items.every(event => event.userName === 'Vitest User')).toBe(true)
  })
})
