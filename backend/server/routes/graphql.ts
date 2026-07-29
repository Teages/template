import type { H3Event } from 'nitro/h3'
import { createYoga } from 'graphql-yoga'
import { defineEventHandler, defineLazyEventHandler } from 'nitro/h3'
import { schema } from '~/server/graphql/schema'

export default defineLazyEventHandler(() => {
  const isTest = import.meta.env.NODE_ENV === 'test' || !!import.meta.env.VITEST

  const yoga = createYoga<{ event: H3Event }>({
    schema,
    fetchAPI: { Response },
    graphqlEndpoint: '/graphql',
    maskedErrors: !(import.meta.dev || isTest),
  })

  return defineEventHandler(async event =>
    yoga.handleRequest(event.req, { event }),
  )
})
