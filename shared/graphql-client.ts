import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import type { OperationDefinitionNode } from 'graphql'
import type { $Fetch } from 'ofetch'
import { print } from 'graphql'
import { $fetch } from 'ofetch'

export type GraphQL$Fetch = Pick<$Fetch, 'raw'>

export interface GraphQLError {
  message: string
  locations?: Array<{ line: number, column: number }>
  path?: Array<string | number>
  extensions?: Record<string, unknown>
}

export class GraphQLRequestError extends Error {
  override readonly name = 'GraphQLRequestError'
  constructor(
    public readonly errors: GraphQLError[],
    public readonly data: unknown,
  ) {
    super(errors.map(error => error.message).join('\n'))
  }
}

export interface RequestOptions {
  url?: string
  headers?: Record<string, string>
  ofetch?: GraphQL$Fetch
}

type IsEmptyRecord<T> = keyof T extends never ? true : T extends Record<string, never> ? true : false

type RequestArgs<TDocument extends TypedDocumentNode<any, any>>
  = IsEmptyRecord<VariablesOf<TDocument>> extends true
    ? [variables?: VariablesOf<TDocument>, options?: RequestOptions]
    : [variables: VariablesOf<TDocument>, options?: RequestOptions]

function getOperationDefinition(
  document: TypedDocumentNode<any, any>,
): OperationDefinitionNode | undefined {
  return document.definitions.find(
    (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition',
  )
}

export async function request<TDocument extends TypedDocumentNode<any, any>>(
  document: TDocument,
  ...args: RequestArgs<TDocument>
): Promise<ResultOf<TDocument>> {
  const [variables, options] = args as [
    VariablesOf<TDocument> | undefined,
    RequestOptions | undefined,
  ]

  const url = options?.url ?? '/api/graphql'
  const ofetch = options?.ofetch ?? $fetch
  const queryString = print(document)
  const definition = getOperationDefinition(document)
  const operationName = definition?.name?.value
  const isMutation
    = definition?.operation === 'mutation'
      || definition?.operation === 'subscription'

  interface GraphQLResponse {
    data?: ResultOf<TDocument>
    errors?: GraphQLError[]
  }

  const postBody = {
    query: queryString,
    ...(variables && { variables }),
    ...(operationName && { operationName }),
  }

  const response = isMutation
    ? await ofetch.raw<GraphQLResponse>(url, {
        method: 'POST',
        responseType: 'json',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: postBody,
      })
    : await ofetch.raw<GraphQLResponse>(url, {
        method: 'GET',
        responseType: 'json',
        headers: options?.headers,
        query: {
          query: queryString,
          ...(variables && Object.keys(variables).length > 0 && {
            variables: JSON.stringify(variables),
          }),
          ...(operationName && { operationName }),
        },
      })

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`)
  }

  const result = response._data
  if (!result) {
    throw new Error('No response data received')
  }

  if (result.errors && result.errors.length > 0) {
    throw new GraphQLRequestError(result.errors, result.data)
  }

  return result.data as ResultOf<TDocument>
}
