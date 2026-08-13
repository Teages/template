import type { TypedDocumentNode } from 'gazania'
import type { DeeplyAllowMatchers } from 'vitest'
import type { GraphQLFetch } from '~/plugins/graphql-schema/runtime/app/client'
import { parse } from 'graphql'
import { describe, expect, it, vi } from 'vitest'
import {
  GraphQLRequestError,
  request,
} from '~/plugins/graphql-schema/runtime/app/client'

function stringContaining(value: string): string {
  return expect.stringContaining(value) as string
}

function objectContaining<T extends object>(value: DeeplyAllowMatchers<T>): T {
  return expect.objectContaining(value) as T
}

function mockFetch<T>(response: {
  data?: T
  errors?: Array<{ message: string }>
}) {
  const spy = vi.fn<GraphQLFetch>().mockResolvedValue(response)
  return {
    fetch: spy as unknown as GraphQLFetch,
    spy,
  }
}

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
    const { fetch, spy } = mockFetch({
      data: { __typename: 'Query' },
    })

    const result = await request(HelloQuery, undefined, { fetch, url: '/api/graphql' })

    expect(result).toEqual({ __typename: 'Query' })
    expect(spy).toHaveBeenCalledWith('/api/graphql', objectContaining({
      method: 'GET',
      params: objectContaining({
        query: stringContaining('query Hello'),
      }),
    }))
  })

  it('posts mutations with JSON body', async () => {
    const { fetch, spy } = mockFetch({
      data: { recordCount: { id: '1' } },
    })

    await request(CreateMutation, undefined, { fetch, url: '/api/graphql' })

    expect(spy).toHaveBeenCalledWith('/api/graphql', objectContaining({
      method: 'POST',
      body: objectContaining({
        query: stringContaining('mutation Record'),
      }),
    }))
  })

  it('throws GraphQLRequestError when the API returns errors', async () => {
    const { fetch } = mockFetch({
      errors: [{ message: 'nope' }],
      data: null,
    })

    await expect(
      request(HelloQuery, undefined, { fetch, url: '/api/graphql' }),
    ).rejects.toBeInstanceOf(GraphQLRequestError)
  })
})
