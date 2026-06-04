import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import type { GraphQLFetch, RequestOptions } from '~/utils/graphql-client'
import { GRAPHQL_PATH } from '#shared/utils/graphql-path'
import { request } from '~/utils/graphql-client'

export interface ApiClient {
  request: <TDocument extends TypedDocumentNode<any, any>>(
    document: TDocument,
    variables: VariablesOf<TDocument>,
  ) => Promise<ResultOf<TDocument>>
}

function createApiClient(fetch: GraphQLFetch): ApiClient {
  const baseOptions: RequestOptions = { url: GRAPHQL_PATH, fetch }
  return {
    request: (document, variables) => request(document, variables, baseOptions),
  }
}

let sharedClient: ApiClient | null = null

export function useApiClient(): ApiClient {
  const requestFetch = useRequestFetch() as GraphQLFetch

  if (import.meta.client) {
    sharedClient ??= createApiClient(requestFetch)
    return sharedClient
  }

  return createApiClient(requestFetch)
}
