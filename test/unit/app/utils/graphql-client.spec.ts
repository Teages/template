import type { TypedDocumentNode } from 'gazania'
import type { FetchOptions, FetchRequest, FetchResponse } from 'ofetch'
import { parse } from 'graphql'
import { describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError, request } from '#shared/graphql-client'

const HelloQuery = parse(`
  query Hello {
    __typename
  }
`) as TypedDocumentNode<{ __typename: string }, Record<string, never>>

const CreateMutation = parse(`
  mutation Create {
    createTodo(input: { title: "x" }) {
      id
    }
  }
`) as TypedDocumentNode<{ createTodo: { id: string } }, Record<string, never>>

/** ofetch instance reduced to `raw`, resolving `_data` to the given GraphQL payload. */
function mockOFetch(payload: unknown) {
  return {
    raw: vi.fn(async (_request: FetchRequest, _options?: FetchOptions<any>): Promise<FetchResponse<any>> =>
      Object.assign(new Response(JSON.stringify(payload)), { _data: payload })),
  }
}

describe('graphql-client request', () => {
  it('queries via GET with the printed query in the query params', async () => {
    const ofetch = mockOFetch({ data: { __typename: 'Query' } })

    const result = await request(HelloQuery, undefined, { ofetch })

    expect(result).toEqual({ __typename: 'Query' })
    const [url, options] = ofetch.raw.mock.calls[0] ?? []
    expect(url).toBe('/api/graphql')
    expect(String(options?.query?.query)).toContain('query Hello')
  })

  it('posts mutations with a JSON body', async () => {
    const ofetch = mockOFetch({ data: { createTodo: { id: '1' } } })

    await request(CreateMutation, undefined, { ofetch })

    const [url, options] = ofetch.raw.mock.calls[0] ?? []
    expect(url).toBe('/api/graphql')
    expect(options?.method).toBe('POST')
    expect(options?.body).toEqual(expect.objectContaining({
      query: expect.stringContaining('mutation Create'),
    }))
  })

  it('throws GraphQLRequestError when the API returns errors', async () => {
    const ofetch = mockOFetch({ errors: [{ message: 'nope' }], data: null })

    const promise = request(HelloQuery, undefined, { ofetch })

    await expect(promise).rejects.toBeInstanceOf(GraphQLRequestError)
    const cause: unknown = await promise.then(() => undefined, (error: unknown) => error)
    if (cause instanceof GraphQLRequestError) {
      expect(cause.errors[0]?.message).toBe('nope')
      expect(cause.data).toBeNull()
    }
  })
})
