import { describe } from 'vitest'
import { baseURL, expect, test } from './test-utils'

describe('persisted operations', () => {
  test('rejects a query that is not in the allowlist', async () => {
    const response = await fetch(`${baseURL}/api/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ neverInAllowList: __typename }' }),
    })

    await expect(response.json()).resolves.toMatchObject({
      errors: [
        { message: 'PersistedQueryOnly' },
      ],
    })
  })
})
