import { print } from 'graphql'
import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/plugins/graphql-schema/runtime/shared/gazania.ts'
import { resetAuthRateLimits } from '~/server/auth/rate-limit'
import { useAuthRateLimitStorage } from '~/server/auth/rate-limit-storage'
import { createGraphQLTestClient, postGraphQL, resetTestDatabase, uniqueAuthEmail } from '~/test/utils'

function signUpMutation(name: string, email: string, password: string) {
  return gazania.mutation(`AuthSignUpEmail_${name}`)
    .select($ => $.select([{
      signUpEmail: $ => $.args({
        input: { name: 'Vitest User', email, password },
      }).select([
        '__typename',
        {
          '... on SignUpEmailPayload': $ => $.select([{ user: $ => $.select(['email', 'name']) }]),
          '... on ConflictError': $ => $.select(['message']),
          '... on BadUserInputError': $ => $.select(['message']),
          '... on RateLimitedError': $ => $.select(['message']),
        },
      ]),
    }]))
}

describe('mutation signUpEmail', () => {
  beforeEach(async () => {
    await resetAuthRateLimits(useAuthRateLimitStorage())
    await resetTestDatabase()
  })

  it('creates a user and returns a session cookie', async () => {
    const email = uniqueAuthEmail('sign-up')
    const posted = await postGraphQL(serverFetch, {
      query: print(signUpMutation('Happy', email, 'password-8-chars')),
    })

    expect(posted.status).toBe(200)
    expect(posted.cookie.length).toBeGreaterThan(0)
    expect(JSON.stringify(posted.json)).not.toContain('token')

    const body = posted.json as {
      data: { signUpEmail: { __typename: string, user?: { email: string, name: string } } }
    }
    expect(body.data.signUpEmail.__typename).toBe('SignUpEmailPayload')
    expect(body.data.signUpEmail.user?.email).toBe(email)
    expect(body.data.signUpEmail.user?.name).toBe('Vitest User')
  })

  it('resolves a short password as BadUserInputError', async () => {
    const client = createGraphQLTestClient(serverFetch)
    const res = await client.mutation(
      gazania.mutation('AuthSignUpEmail_ShortPassword')
        .select($ => $.select([{
          signUpEmail: $ => $.args({
            input: {
              name: 'Vitest User',
              email: uniqueAuthEmail('short'),
              password: 'short',
            },
          }).select([
            '__typename',
            { '... on BadUserInputError': $ => $.select(['message']) },
          ]),
        }])),
    )
    expect(res.signUpEmail.__typename).toBe('BadUserInputError')
  })

  it('resolves a duplicate email as ConflictError', async () => {
    const email = uniqueAuthEmail('duplicate')
    const client = createGraphQLTestClient(serverFetch)
    const first = await client.mutation(signUpMutation('First', email, 'password-8-chars'))
    expect(first.signUpEmail.__typename).toBe('SignUpEmailPayload')

    const second = await client.mutation(
      gazania.mutation('AuthSignUpEmail_Duplicate')
        .select($ => $.select([{
          signUpEmail: $ => $.args({
            input: { name: 'Vitest User', email, password: 'password-8-chars' },
          }).select([
            '__typename',
            { '... on ConflictError': $ => $.select(['message']) },
          ]),
        }])),
    )
    expect(second.signUpEmail.__typename).toBe('ConflictError')
    expect(second.signUpEmail.message).toBe('User already exists')
  })
})
