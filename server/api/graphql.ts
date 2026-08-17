import type { H3Event } from 'nitro/h3'
import { createYoga } from 'graphql-yoga'
import { defineEventHandler, defineLazyEventHandler } from 'nitro/h3'
import { applyAuthSetCookies, takeCollectedAuthSetCookies } from '~/server/auth/cookies'
import { assertGraphQLHttpRequest } from '~/server/auth/graphql-http'
import { graphqlTrustedOrigins } from '~/server/auth/origin'
import { schema } from '~/server/graphql/schema'
import { readBetterAuthEnv } from '~/server/utils/auth-env'

export default defineLazyEventHandler(() => {
  const isTest = import.meta.env.NODE_ENV === 'test' || !!import.meta.env.VITEST
  const trustedOrigins = graphqlTrustedOrigins(readBetterAuthEnv())

  const yoga = createYoga<{ event: H3Event }>({
    schema,
    fetchAPI: { Response },
    graphqlEndpoint: '/api/graphql',
    maskedErrors: !(import.meta.dev || isTest),
  })

  return defineEventHandler(async (event) => {
    assertGraphQLHttpRequest(event.req, trustedOrigins)
    const response = await yoga.handleRequest(event.req, { event })
    return applyAuthSetCookies(response, takeCollectedAuthSetCookies(event))
  })
})
