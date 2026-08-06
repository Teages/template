import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTRPCTestClient, resetTestDatabase, signInTestUser } from '~/test/utils'

describe('trpc count', () => {
  beforeEach(async () => {
    await serverFetch('/api/auth/get-session')
    await resetTestDatabase()
  })

  it('rejects unauthenticated list requests', async () => {
    const client = createTRPCTestClient(serverFetch)

    await expect(
      client.count.list.query(),
    ).rejects.toThrow(/sign in/i)
  })

  it('rejects unauthenticated create requests', async () => {
    const client = createTRPCTestClient(serverFetch)

    await expect(
      client.count.create.mutate(),
    ).rejects.toThrow(/sign in/i)
  })

  it('returns a valid page for an authenticated user', async () => {
    const { cookie } = await signInTestUser('trpc-snap')
    const client = createTRPCTestClient(serverFetch, { cookie })

    const page = await client.count.list.query()

    expect(page.total).toBe(0)
    expect(page.items).toEqual([])
    expect(page.nextCursor).toBeNull()
  })

  it('creates a count event and returns the new item and total', async () => {
    const { cookie } = await signInTestUser('trpc-record')
    const client = createTRPCTestClient(serverFetch, { cookie })

    const created = await client.count.create.mutate()

    expect(created.total).toBe(1)
    expect(created.item.userName).toBe('Vitest User')
    expect(created.item.createdAt).toBeTruthy()
  })

  it('persists recorded events across a subsequent snapshot query', async () => {
    const { cookie } = await signInTestUser('trpc-persist')
    const client = createTRPCTestClient(serverFetch, { cookie })

    await client.count.create.mutate()
    const after = await client.count.list.query()

    expect(after.total).toBe(1)
    expect(after.items).toHaveLength(1)
  })

  it('supports typed cursor pagination', async () => {
    const { cookie } = await signInTestUser('trpc-order')
    const client = createTRPCTestClient(serverFetch, { cookie })

    await client.count.create.mutate()
    await client.count.create.mutate()
    await client.count.create.mutate()

    const first = await client.count.list.query({ limit: 2 })
    expect(first.total).toBe(3)
    expect(first.items).toHaveLength(2)
    expect(first.nextCursor).toBe(first.items[1]?.id)

    const second = await client.count.list.query({ limit: 2, cursor: first.nextCursor })
    expect(second.total).toBe(3)
    expect(second.items).toHaveLength(1)
    expect(second.nextCursor).toBeNull()
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id)
  })

  it('validates pagination input', async () => {
    const { cookie } = await signInTestUser('trpc-validation')
    const client = createTRPCTestClient(serverFetch, { cookie })

    await expect(client.count.list.query({ limit: 0 })).rejects.toThrow()
    await expect(client.count.list.query({ cursor: 'not-a-uuid' })).rejects.toThrow()
  })
})
