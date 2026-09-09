import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import type { GraphQL$Fetch, RequestOptions } from '#shared/graphql-client'
import { request } from '#shared/graphql-client'

export interface ApiClient {
  request: <TDocument extends TypedDocumentNode<any, any>>(
    document: TDocument,
    variables: VariablesOf<TDocument>,
  ) => Promise<ResultOf<TDocument>>
}

function createApiClient(ofetch: GraphQL$Fetch): ApiClient {
  const baseOptions: RequestOptions = { url: '/api/graphql', ofetch }
  return {
    request: (document, variables) => request(document, variables, baseOptions),
  }
}

let sharedClient: ApiClient | null = null

export function useApiClient(): ApiClient {
  const requestFetch = useRequestFetch()

  if (import.meta.client) {
    sharedClient ??= createApiClient(requestFetch)
    return sharedClient
  }

  return createApiClient(requestFetch)
}
