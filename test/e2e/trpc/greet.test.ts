import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { createTRPCTestClient } from '~/test/utils'

describe('trpc greet.greet', () => {
  it('returns a greeting for the given name without authentication', async () => {
    const client = createTRPCTestClient(serverFetch)

    const result = await client.greet.greet.query({ name: 'Vitest' })

    expect(result.greeting).toBe('Hello, Vitest!')
    expect(result.at).toBeTruthy()
    // ISO 8601 timestamp
    expect(result.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('rejects an empty name (zod validation)', async () => {
    const client = createTRPCTestClient(serverFetch)

    await expect(
      client.greet.greet.query({ name: '' }),
    ).rejects.toThrow()
  })

  it('accepts a long name within the 100-char limit', async () => {
    const client = createTRPCTestClient(serverFetch)
    const name = 'A'.repeat(100)

    const result = await client.greet.greet.query({ name })

    expect(result.greeting).toBe(`Hello, ${name}!`)
  })
})
