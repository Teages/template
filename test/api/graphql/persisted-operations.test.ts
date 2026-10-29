import { sha256 } from '@teages/oh-my-graphql'
import { parse, print } from 'graphql'
import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import persistedOperations from '#graphql/persisted-operations'
import { createGraphqlYoga } from '#server/graphql/yoga'

describe('persisted operations', () => {
  it('keys the allowlist by the client sha256 of each operation', async () => {
    const entries = Object.entries(persistedOperations)
    expect(entries.length).toBeGreaterThan(0)

    for (const [hash, body] of entries) {
      expect(await sha256(print(parse(body)))).toBe(hash)
    }
  })

  it('rejects a document that is not in the allowlist', async () => {
    const yoga = createGraphqlYoga({ allowArbitraryOperations: false })
    const response = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    })

    await expect(response.json()).resolves.toMatchObject({
      errors: [
        { message: 'PersistedQueryOnly' },
      ],
    })
  })

  it('rejects an unknown hash on the server route', async () => {
    const response = await serverFetch('/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: '0'.repeat(64),
          },
        },
      }),
    })

    await expect(response.json()).resolves.toMatchObject({
      errors: [
        { message: 'PersistedQueryNotFound' },
      ],
    })
  })

  it('runs an allowlisted operation from its hash alone', async () => {
    const hash = Object.keys(persistedOperations)[0]
    if (hash === undefined)
      throw new Error('Persisted operation allowlist is empty.')

    const yoga = createGraphqlYoga({ allowArbitraryOperations: false })
    const response = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: hash,
          },
        },
      }),
    })
    const body: unknown = await response.json()
    expect(persistedQueryError(body)).toBeUndefined()
  })
})

function persistedQueryError(body: unknown): string | undefined {
  if (body == null || typeof body !== 'object' || !('errors' in body))
    return undefined
  const errors: unknown = body.errors
  if (!Array.isArray(errors))
    return undefined
  for (const error of errors) {
    if (error == null || typeof error !== 'object' || !('message' in error))
      continue
    if (typeof error.message !== 'string')
      continue
    if (error.message.startsWith('PersistedQuery'))
      return error.message
  }
  return undefined
}
