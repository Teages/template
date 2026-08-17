import { builder } from '~/server/graphql/builder'
import { User } from '~/server/graphql/schema/user/User'

export const Session = builder.simpleObject('Session', {
  fields: t => ({
    user: t.field({ type: User }),
  }),
})
