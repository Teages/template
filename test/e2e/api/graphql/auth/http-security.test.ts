import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { postGraphQL, testOrigin } from '~/test/utils'

const sessionQuery = '{ session { user { email } } }'

describe('graphQL auth HTTP boundary', () => {
  it('rejects /api/auth catch-all routes', async () => {
    const res = await serverFetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': testOrigin,
      },
      body: JSON.stringify({ email: 'a@test.local', password: 'password-8-chars' }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects a GraphQL POST from an untrusted origin', async () => {
    const posted = await postGraphQL(serverFetch, { query: sessionQuery }, {
      origin: 'https://evil.example',
    })
    expect(posted.status).toBe(403)
  })

  it('rejects a GraphQL POST with a simple Content-Type', async () => {
    const posted = await postGraphQL(serverFetch, { query: sessionQuery }, {
      contentType: 'text/plain',
    })
    expect(posted.status).toBe(415)
  })
})
