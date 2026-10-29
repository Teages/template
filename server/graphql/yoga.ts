import type { H3Event } from 'nitro/h3'
import process from 'node:process'
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations'
import { createYoga } from 'graphql-yoga'
import persistedOperations from '#graphql/persisted-operations'
import { schema } from '#server/graphql/schema'

export interface GraphqlYogaOptions {
  /**
   * Accept documents that are not in the Gazania allowlist.
   * Defaults to interactive dev only. Production and every test except the API
   * project require `extensions.persistedQuery.sha256Hash`.
   */
  allowArbitraryOperations?: boolean
}

export function createGraphqlYoga(options?: GraphqlYogaOptions) {
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST
  const allowArbitraryOperations = options?.allowArbitraryOperations ?? defaultAllowArbitraryOperations(isTest)

  return createYoga<{ event: H3Event<any> }>({
    schema,
    fetchAPI: { Response },
    graphqlEndpoint: '/api/graphql',
    maskedErrors: !(import.meta.dev || isTest),
    plugins: [
      usePersistedOperations({
        allowArbitraryOperations,
        getPersistedOperation(key) {
          return persistedOperations[key] ?? null
        },
      }),
    ],
  })
}

/**
 * Interactive `pnpm dev` accepts full documents so GraphiQL stays usable.
 * Vitest does not, including the e2e server booted with `dev: true`, so those
 * runs exercise the production allowlist. The API project opts in because its
 * resolver tests send documents that are not part of the app.
 */
function defaultAllowArbitraryOperations(isTest: boolean): boolean {
  if (isTest)
    return process.env.GRAPHQL_ALLOW_ARBITRARY_OPERATIONS === '1'
  return import.meta.dev ?? false
}
