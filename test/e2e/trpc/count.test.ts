import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { createTRPCTestClient, signInTestUser } from '~/test/utils'

describe('trpc count', () => {
  it('rejects unauthenticated snapshot requests', async () => {
    const client = createTRPCTestClient(serverFetch)

    await expect(
      client.count.snapshot.query(),
    ).rejects.toThrow(/sign in/i)
  })

  it('rejects unauthenticated record requests', async () => {
    const client = createTRPCTestClient(serverFetch)

    await expect(
      client.count.record.mutate(),
    ).rejects.toThrow(/sign in/i)
  })

  it('returns a valid snapshot for an authenticated user', async () => {
    const { cookie } = await signInTestUser('trpc-snap')
    const client = createTRPCTestClient(serverFetch, { cookie })

    const snapshot = await client.count.snapshot.query()

    expect(snapshot.count).toBeGreaterThanOrEqual(0)
    expect(snapshot.events).toHaveLength(snapshot.count)
  })

  it('records a count event and reflects it in the returned snapshot', async () => {
    const { cookie } = await signInTestUser('trpc-record')
    const client = createTRPCTestClient(serverFetch, { cookie })

    const before = await client.count.snapshot.query()
    const after = await client.count.record.mutate()

    expect(after.count).toBe(before.count + 1)
    expect(after.events).toHaveLength(after.count)
    expect(after.events[0]?.userName).toBe('Vitest User')
    expect(after.events[0]?.createdAt).toBeTruthy()
  })

  it('persists recorded events across a subsequent snapshot query', async () => {
    const { cookie } = await signInTestUser('trpc-persist')
    const client = createTRPCTestClient(serverFetch, { cookie })

    const before = await client.count.snapshot.query()
    await client.count.record.mutate()
    const after = await client.count.snapshot.query()

    expect(after.count).toBe(before.count + 1)
  })

  it('lists events newest-first', async () => {
    const { cookie } = await signInTestUser('trpc-order')
    const client = createTRPCTestClient(serverFetch, { cookie })

    await client.count.record.mutate()
    await client.count.record.mutate()

    const snapshot = await client.count.snapshot.query()

    expect(snapshot.events.length).toBeGreaterThanOrEqual(2)
    const [first, second] = snapshot.events
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(new Date(first!.createdAt).getTime())
      .toBeGreaterThanOrEqual(new Date(second!.createdAt).getTime())
  })
})
