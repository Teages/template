import { defineEventHandler, defineLazyEventHandler } from 'nitro/h3'
import { createGraphqlYoga } from '#server/graphql/yoga'

export default defineLazyEventHandler(() => {
  const yoga = createGraphqlYoga()

  return defineEventHandler(event =>
    yoga.handleRequest(event.req, { event }),
  )
})
