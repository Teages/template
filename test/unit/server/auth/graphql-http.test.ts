import { HTTPError } from 'nitro/h3'
import { describe, expect, it } from 'vitest'
import { assertGraphQLHttpRequest } from '~/server/auth/graphql-http'

const trusted = ['http://localhost:20398'] as const

function post(init: { origin?: string, contentType?: string }): Request {
  const headers = new Headers()
  if (init.contentType !== undefined)
    headers.set('content-type', init.contentType)
  if (init.origin !== undefined)
    headers.set('origin', init.origin)
  return new Request('http://localhost/api/graphql', {
    method: 'POST',
    headers,
  })
}

describe('assertGraphQLHttpRequest', () => {
  it('allows a JSON POST from a trusted origin', () => {
    expect(() => assertGraphQLHttpRequest(
      post({ origin: 'http://localhost:20398', contentType: 'application/json; charset=utf-8' }),
      trusted,
    )).not.toThrow()
  })

  it('skips Origin and Content-Type checks for GET (GraphiQL)', () => {
    expect(() => assertGraphQLHttpRequest(
      new Request('http://localhost/api/graphql'),
      trusted,
    )).not.toThrow()
  })

  it('rejects a POST with a simple Content-Type', () => {
    try {
      assertGraphQLHttpRequest(
        post({ origin: 'http://localhost:20398', contentType: 'text/plain' }),
        trusted,
      )
      expect.unreachable()
    }
    catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      expect((error as HTTPError).status).toBe(415)
    }
  })

  it('rejects a POST from an untrusted origin', () => {
    try {
      assertGraphQLHttpRequest(
        post({ origin: 'https://evil.example', contentType: 'application/json' }),
        trusted,
      )
      expect.unreachable()
    }
    catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      expect((error as HTTPError).status).toBe(403)
    }
  })
})
