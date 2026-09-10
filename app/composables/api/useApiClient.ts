import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import type { $Fetch } from 'ofetch'
import { createClient } from '@teages/oh-my-graphql'

export interface ApiClient {
  request: <TDocument extends TypedDocumentNode<any, any>>(
    document: TDocument,
    variables: VariablesOf<TDocument>,
  ) => Promise<ResultOf<TDocument>>
}

let sharedClient: ApiClient | null = null

export function useApiClient(): ApiClient {
  const requestFetch = useRequestFetch()

  if (import.meta.client) {
    sharedClient ??= createClient('/api/graphql', {
      ofetch: requestFetch as $Fetch,
      preferQueryMethod: 'GET',
    })
    return sharedClient
  }

  return createClient('/api/graphql', {
    ofetch: requestFetch as $Fetch,
    preferQueryMethod: 'GET',
  })
}
