import { signUpEmail } from '~/server/auth/operations'
import { builder } from '~/server/graphql/builder'
import {
  BadUserInputError,
  ConflictError,
  RateLimitedError,
} from '~/server/graphql/errors'
import { User } from '~/server/graphql/schema/user/User'

const SignUpEmailInput = builder.inputType('SignUpEmailInput', {
  fields: t => ({
    name: t.string({ required: true }),
    email: t.string({ required: true }),
    password: t.string({ required: true }),
    rememberMe: t.boolean({ required: false }),
  }),
})

const SignUpEmailPayload = builder.simpleObject('SignUpEmailPayload', {
  fields: t => ({
    user: t.field({ type: User }),
  }),
})

builder.mutationFields(t => ({
  signUpEmail: t.field({
    type: SignUpEmailPayload,
    args: {
      input: t.arg({ type: SignUpEmailInput, required: true }),
    },
    errors: {
      types: [ConflictError, BadUserInputError, RateLimitedError],
      directResult: true,
    },
    resolve: async (_root, { input }, { event }) => {
      return await signUpEmail(event, {
        name: input.name,
        email: input.email,
        password: input.password,
        ...(input.rememberMe === undefined || input.rememberMe === null
          ? {}
          : { rememberMe: input.rememberMe }),
      })
    },
  }),
}))
