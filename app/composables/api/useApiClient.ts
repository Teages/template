import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import type { $Fetch } from 'ofetch'
import type { RequestOptions } from '#shared/graphql-client'
import { request } from '#shared/graphql-client'

export interface ApiClient {
  request: <TDocument extends TypedDocumentNode<any, any>>(
    document: TDocument,
    variables: VariablesOf<TDocument>,
  ) => Promise<ResultOf<TDocument>>
}

function createApiClient(fetch: typeof globalThis.fetch): ApiClient {
  const baseOptions: RequestOptions = { url: '/graphql', fetch }
  return {
    request: (document, variables) => request(document, variables, baseOptions),
  }
}

let sharedClient: ApiClient | null = null

export function useApiClient(): ApiClient {
  const requestFetch = (useRequestFetch() as $Fetch).native

  if (import.meta.client) {
    sharedClient ??= createApiClient(requestFetch)
    return sharedClient
  }

  return createApiClient(requestFetch)
}
