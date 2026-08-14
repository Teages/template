import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/plugins/graphql-schema/runtime/shared/gazania.ts'
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
          recordCount: $ => $.select([
            '__typename',
            { '... on RecordCountPayload': $ => $.select([{ countEvent: $ => $.select(['id']) }]) },
          ]),
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
        .select($ => $.select([{
          count: $ => $.select([
            '__typename',
            { '... on QueryCountSuccess': $ => $.select(['data']) },
          ]),
          countEvents: $ => $.args({ first: 10 }).select([
            '__typename',
            {
              '... on QueryCountEventsConnection': $ => $.select([{
                edges: $ => $.select([{
                  node: $ => $.select(['id', { user: $ => $.select(['name']) }]),
                }]),
              }]),
            },
          ]),
        }])),
    )
    const rpc = await trpc.count.list.query({ limit: 10 })

    expect(rest.meta.total).toBe(3)
    expect(graph.count.data).toBe(3)
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

  it('keeps cursor pagination boundaries aligned', async () => {
    const { cookie } = await signInTestUser('count-pagination-contract')
    const headers = { Cookie: cookie }
    const graphql = createGraphQLTestClient(serverFetch, { cookie })
    const trpc = createTRPCTestClient(serverFetch, { cookie })

    await trpc.count.create.mutate()
    await trpc.count.create.mutate()
    await trpc.count.create.mutate()

    const restFirst = await serverFetch('/api/count-events?limit=2', { headers })
      .then(response => response.json()) as {
      data: Array<{ id: string }>
      meta: { total: number, nextCursor: string | null }
    }
    const graphFirst = await graphql.query(
      gazania.query('ReadFirstCountEventsPageForContract')
        .select($ => $.select([{
          countEvents: $ => $.args({ first: 2 }).select([
            '__typename',
            {
              '... on QueryCountEventsConnection': $ => $.select([{
                edges: $ => $.select([{ node: $ => $.select(['id']) }]),
                pageInfo: $ => $.select(['endCursor', 'hasNextPage']),
              }]),
            },
          ]),
        }])),
    )
    const rpcFirst = await trpc.count.list.query({ limit: 2 })

    const restFirstIds = restFirst.data.map(event => event.id)
    const graphFirstIds = graphFirst.countEvents.edges.map(edge => String(edge.node.id))
    const rpcFirstIds = rpcFirst.items.map(event => event.id)
    expect(restFirst.meta.total).toBe(3)
    expect(rpcFirst.total).toBe(3)
    expect(graphFirstIds).toEqual(restFirstIds)
    expect(rpcFirstIds).toEqual(restFirstIds)
    expect(restFirst.meta.nextCursor).toBeTruthy()
    expect(graphFirst.countEvents.pageInfo.hasNextPage).toBe(true)
    expect(graphFirst.countEvents.pageInfo.endCursor).toBeTruthy()
    expect(rpcFirst.nextCursor).toBeTruthy()

    const restSecond = await serverFetch(
      `/api/count-events?limit=2&cursor=${encodeURIComponent(restFirst.meta.nextCursor!)}`,
      { headers },
    ).then(response => response.json()) as {
      data: Array<{ id: string }>
      meta: { total: number, nextCursor: string | null }
    }
    const graphSecond = await graphql.query(
      gazania.query('ReadSecondCountEventsPageForContract')
        .select($ => $.select([{
          countEvents: $ => $.args({
            first: 2,
            after: graphFirst.countEvents.pageInfo.endCursor,
          }).select([
            '__typename',
            {
              '... on QueryCountEventsConnection': $ => $.select([{
                edges: $ => $.select([{ node: $ => $.select(['id']) }]),
                pageInfo: $ => $.select(['hasNextPage']),
              }]),
            },
          ]),
        }])),
    )
    const rpcSecond = await trpc.count.list.query({
      limit: 2,
      cursor: rpcFirst.nextCursor,
    })

    const restSecondIds = restSecond.data.map(event => event.id)
    const graphSecondIds = graphSecond.countEvents.edges.map(edge => String(edge.node.id))
    const rpcSecondIds = rpcSecond.items.map(event => event.id)
    expect(restSecond.meta.total).toBe(3)
    expect(rpcSecond.total).toBe(3)
    expect(graphSecondIds).toEqual(restSecondIds)
    expect(rpcSecondIds).toEqual(restSecondIds)
    expect(restSecondIds).toHaveLength(1)
    expect(restSecond.meta.nextCursor).toBeNull()
    expect(graphSecond.countEvents.pageInfo.hasNextPage).toBe(false)
    expect(rpcSecond.nextCursor).toBeNull()
  })
})
