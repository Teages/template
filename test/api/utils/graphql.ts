import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import type { Schema } from '#shared/gazania'
import { createGazania } from 'gazania'
import { serverFetch } from 'nitro/app'
import { request } from '#shared/graphql-client'

export type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
export const gazania = createGazania({} as Schema)

export function requestGraphQL<
  TDocument extends TypedDocumentNode<any, any>,
>(
  document: TDocument,
  variables: VariablesOf<TDocument>,
  headers?: Record<string, string>,
): Promise<ResultOf<TDocument>> {
  return request(document, variables, {
    url: '/graphql',
    fetch: serverFetch,
    headers,
  })
}
