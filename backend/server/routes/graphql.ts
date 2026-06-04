import type { H3Event } from 'nitro/h3'
import process from 'node:process'
import { createYoga } from 'graphql-yoga'
import { defineEventHandler, defineLazyEventHandler } from 'nitro/h3'
import { schema } from '~/server/graphql/schema'

export default defineLazyEventHandler(() => {
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST

  const yoga = createYoga<{ event: H3Event }>({
    schema,
    fetchAPI: { Response },
    graphqlEndpoint: '/graphql',
    maskedErrors: !(import.meta.dev || isTest),
  })

  return defineEventHandler(async (event) => {
    const ctx = { event }
    return yoga.handleRequest(event.req, ctx as never)
  })
})
