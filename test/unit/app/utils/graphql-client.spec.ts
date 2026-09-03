import type { TypedDocumentNode } from 'gazania'
import { parse } from 'graphql'
import { describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError, request } from '~/utils/graphql-client'

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

describe('graphql-client request', () => {
  it('returns data for a successful query via GET', async () => {
    const fetch = vi.fn().mockResolvedValue({
      data: { __typename: 'Query' },
    }) as any

    const result = await request(HelloQuery, undefined, { fetch, url: '/graphql' })

    expect(result).toEqual({ __typename: 'Query' })
    expect(fetch).toHaveBeenCalledWith('/graphql', expect.objectContaining({
      method: 'GET',
      query: expect.objectContaining({
        query: expect.stringContaining('query Hello'),
      }),
    }))
  })

  it('posts mutations with JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue({
      data: { createTodo: { id: '1' } },
    }) as any

    await request(CreateMutation, undefined, { fetch, url: '/graphql' })

    expect(fetch).toHaveBeenCalledWith('/graphql', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        query: expect.stringContaining('mutation Create'),
      }),
    }))
  })

  it('throws GraphQLRequestError when the API returns errors', async () => {
    const fetch = vi.fn().mockResolvedValue({
      errors: [{ message: 'nope' }],
      data: null,
    }) as any

    await expect(
      request(HelloQuery, undefined, { fetch }),
    ).rejects.toBeInstanceOf(GraphQLRequestError)
  })
})
