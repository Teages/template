import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { postGraphQL } from '~/test/utils'

const boundaryQuery = '{ __typename }'

describe('graphQL auth HTTP boundary', () => {
  it('rejects a GraphQL POST from an untrusted origin', async () => {
    const posted = await postGraphQL(serverFetch, { query: boundaryQuery }, {
      origin: 'https://evil.example',
    })
    expect(posted.status).toBe(403)
  })

  it('rejects a GraphQL POST with a simple Content-Type', async () => {
    const posted = await postGraphQL(serverFetch, { query: boundaryQuery }, {
      contentType: 'text/plain',
    })
    expect(posted.status).toBe(415)
  })
})
