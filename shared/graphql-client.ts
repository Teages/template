import type { ResultOf, TypedDocumentNode, VariablesOf } from 'gazania'
import type { OperationDefinitionNode } from 'graphql'
import { print } from 'graphql'
import { createFetch } from 'ofetch'

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
  fetch?: typeof globalThis.fetch
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

const fetcherCache = new WeakMap<typeof globalThis.fetch, ReturnType<typeof createFetch>>()
function createFetcher(fetch: typeof globalThis.fetch): ReturnType<typeof createFetch> {
  if (!fetcherCache.has(fetch)) {
    fetcherCache.set(fetch, createFetch({ fetch }))
  }
  return fetcherCache.get(fetch)!
}

export async function request<TDocument extends TypedDocumentNode<any, any>>(
  document: TDocument,
  ...args: RequestArgs<TDocument>
): Promise<ResultOf<TDocument>> {
  const [variables, options] = args as [
    VariablesOf<TDocument> | undefined,
    RequestOptions | undefined,
  ]

  const url = options?.url ?? '/graphql'
  const fetcher = createFetcher(options?.fetch ?? globalThis.fetch)
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
    ? await fetcher<GraphQLResponse>(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: postBody,
      })
    : await fetcher<GraphQLResponse>(url, {
        method: 'GET',
        headers: options?.headers,
        query: {
          query: queryString,
          ...(variables && Object.keys(variables).length > 0 && {
            variables: JSON.stringify(variables),
          }),
          ...(operationName && { operationName }),
        },
      })

  if (response.errors && response.errors.length > 0) {
    throw new GraphQLRequestError(response.errors, response.data)
  }

  return response.data as ResultOf<TDocument>
}
