import { signInEmail } from '~/server/auth/operations'
import { builder } from '~/server/graphql/builder'
import {
  BadUserInputError,
  InvalidCredentialsError,
  RateLimitedError,
} from '~/server/graphql/errors'
import { User } from '~/server/graphql/schema/user/User'

const SignInEmailInput = builder.inputType('SignInEmailInput', {
  fields: t => ({
    email: t.string({ required: true }),
    password: t.string({ required: true }),
    rememberMe: t.boolean({ required: false }),
  }),
})

const SignInEmailPayload = builder.simpleObject('SignInEmailPayload', {
  fields: t => ({
    user: t.field({ type: User }),
  }),
})

builder.mutationFields(t => ({
  signInEmail: t.field({
    type: SignInEmailPayload,
    args: {
      input: t.arg({ type: SignInEmailInput, required: true }),
    },
    errors: {
      types: [InvalidCredentialsError, BadUserInputError, RateLimitedError],
      directResult: true,
    },
    resolve: async (_root, { input }, { event }) => {
      return await signInEmail(event, {
        email: input.email,
        password: input.password,
        ...(input.rememberMe === undefined || input.rememberMe === null
          ? {}
          : { rememberMe: input.rememberMe }),
      })
    },
  }),
}))
