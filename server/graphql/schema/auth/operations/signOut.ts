import { signOut } from '~/server/auth/operations'
import { builder } from '~/server/graphql/builder'
import { RateLimitedError } from '~/server/graphql/errors'

const SignOutPayload = builder.simpleObject('SignOutPayload', {
  fields: t => ({
    ok: t.boolean(),
  }),
})

builder.mutationFields(t => ({
  signOut: t.field({
    type: SignOutPayload,
    errors: { types: [RateLimitedError], directResult: true },
    resolve: async (_root, _args, { event }) => {
      return await signOut(event)
    },
  }),
}))
