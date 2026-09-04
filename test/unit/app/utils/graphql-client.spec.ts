import type { TypedDocumentNode } from 'gazania'
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

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('graphql-client request', () => {
  it('returns data for a successful query via GET', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ data: { __typename: 'Query' } }))

    const result = await request(HelloQuery, undefined, { fetch })

    expect(result).toEqual({ __typename: 'Query' })
    const [url] = fetch.mock.calls[0] ?? []
    expect(String(url)).toMatch(/^\/graphql\?/)
    expect(decodeURIComponent(String(url).replaceAll('+', '%20'))).toContain('query Hello')
  })

  it('posts mutations with a JSON body', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ data: { createTodo: { id: '1' } } }))

    await request(CreateMutation, undefined, { fetch })

    const [url, options] = fetch.mock.calls[0] ?? []
    expect(url).toBe('/graphql')
    expect(options?.method).toBe('POST')
    expect(JSON.parse(String(options?.body))).toEqual(expect.objectContaining({
      query: expect.stringContaining('mutation Create'),
    }))
  })

  it('throws GraphQLRequestError when the API returns errors', async () => {
    const fetch = vi.fn(async () => jsonResponse({ errors: [{ message: 'nope' }], data: null }))

    const promise = request(HelloQuery, undefined, { fetch })

    await expect(promise).rejects.toBeInstanceOf(GraphQLRequestError)
    const cause: unknown = await promise.then(() => undefined, (error: unknown) => error)
    if (cause instanceof GraphQLRequestError) {
      expect(cause.errors[0]?.message).toBe('nope')
      expect(cause.data).toBeNull()
    }
  })
})
