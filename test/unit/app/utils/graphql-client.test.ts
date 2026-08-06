import type { TypedDocumentNode } from 'gazania'
import { parse } from 'graphql'
import { describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError, request } from '~/app/utils/graphql-client.ts'

const HelloQuery = parse(`
  query Hello {
    __typename
  }
`) as TypedDocumentNode<{ __typename: string }, Record<string, never>>

const CreateMutation = parse(`
  mutation Record {
    recordCount {
      id
    }
  }
`) as TypedDocumentNode<{ recordCount: { id: string } }, Record<string, never>>

describe('graphql-client request', () => {
  it('returns data for a successful query via GET', async () => {
    const fetch = vi.fn().mockResolvedValue({
      data: { __typename: 'Query' },
    }) as any

    const result = await request(HelloQuery, undefined, { fetch, url: '/api/graphql' })

    expect(result).toEqual({ __typename: 'Query' })
    expect(fetch).toHaveBeenCalledWith('/api/graphql', expect.objectContaining({
      method: 'GET',
      params: expect.objectContaining({
        query: expect.stringContaining('query Hello'),
      }),
    }))
  })

  it('posts mutations with JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue({
      data: { recordCount: { id: '1' } },
    }) as any

    await request(CreateMutation, undefined, { fetch, url: '/api/graphql' })

    expect(fetch).toHaveBeenCalledWith('/api/graphql', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        query: expect.stringContaining('mutation Record'),
      }),
    }))
  })

  it('throws GraphQLRequestError when the API returns errors', async () => {
    const fetch = vi.fn().mockResolvedValue({
      errors: [{ message: 'nope' }],
      data: null,
    }) as any

    await expect(
      request(HelloQuery, undefined, { fetch, url: '/api/graphql' }),
    ).rejects.toBeInstanceOf(GraphQLRequestError)
  })
})
