import { print } from 'graphql'
import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import { gazania } from '~/plugins/graphql-schema/runtime/shared/gazania.ts'
import { resetAuthRateLimits } from '~/server/auth/rate-limit'
import { useAuthRateLimitStorage } from '~/server/auth/rate-limit-storage'
import {
  createGraphQLTestClient,
  postGraphQL,
  resetTestDatabase,
  uniqueAuthEmail,
} from '~/test/utils'

function signUpMutation(name: string, email: string, password: string) {
  return gazania.mutation(`AuthSignUp_${name}`)
    .select($ => $.select([{
      signUpEmail: $ => $.args({
        input: { name, email, password },
      }).select([
        '__typename',
        {
          '... on SignUpEmailPayload': $ => $.select([{ user: $ => $.select(['email']) }]),
          '... on ConflictError': $ => $.select(['message']),
          '... on BadUserInputError': $ => $.select(['message']),
          '... on RateLimitedError': $ => $.select(['message']),
        },
      ]),
    }]))
}

function signInMutation(name: string, email: string, password: string) {
  return gazania.mutation(`AuthSignIn_${name}`)
    .select($ => $.select([{
      signInEmail: $ => $.args({
        input: { email, password },
      }).select([
        '__typename',
        {
          '... on SignInEmailPayload': $ => $.select([{ user: $ => $.select(['email']) }]),
          '... on InvalidCredentialsError': $ => $.select(['message']),
          '... on BadUserInputError': $ => $.select(['message']),
          '... on RateLimitedError': $ => $.select(['message']),
        },
      ]),
    }]))
}

describe('mutation signInEmail', () => {
  beforeEach(async () => {
    await resetAuthRateLimits(useAuthRateLimitStorage())
    await resetTestDatabase()
  })

  it('signs in and returns a session cookie for the authenticated user', async () => {
    const email = uniqueAuthEmail('sign-in')
    const password = 'password-8-chars'
    const signUp = await postGraphQL(serverFetch, {
      query: print(signUpMutation('ForSignIn', email, password)),
    })
    expect(signUp.status).toBe(200)

    const signIn = await postGraphQL(serverFetch, {
      query: print(signInMutation('Happy', email, password)),
    })
    expect(signIn.status).toBe(200)
    expect(signIn.cookie.length).toBeGreaterThan(0)
    expect(JSON.stringify(signIn.json)).not.toContain('token')

    const body = signIn.json as {
      data: { signInEmail: { __typename: string, user?: { email: string } } }
    }
    expect(body.data.signInEmail.__typename).toBe('SignInEmailPayload')
    expect(body.data.signInEmail.user?.email).toBe(email)

    const client = createGraphQLTestClient(serverFetch, { cookie: signIn.cookie })
    const session = await client.query(
      gazania.query('AuthSignInSession')
        .select($ => $.select([{
          session: $ => $.select([{ user: $ => $.select(['email']) }]),
        }])),
    )
    expect(session.session?.user.email).toBe(email)
  })

  it('resolves a wrong password as InvalidCredentialsError', async () => {
    const email = uniqueAuthEmail('bad-password')
    await postGraphQL(serverFetch, {
      query: print(signUpMutation('ForBadPassword', email, 'password-8-chars')),
    })

    const client = createGraphQLTestClient(serverFetch)
    const res = await client.mutation(
      gazania.mutation('AuthSignInWrongPassword')
        .select($ => $.select([{
          signInEmail: $ => $.args({
            input: { email, password: 'wrong-password' },
          }).select([
            '__typename',
            { '... on InvalidCredentialsError': $ => $.select(['message']) },
          ]),
        }])),
    )
    expect(res.signInEmail.__typename).toBe('InvalidCredentialsError')
    expect(res.signInEmail.message).toBe('Invalid email or password')
  })

  it('resolves a fourth sign-in in 10 seconds as RateLimitedError', async () => {
    const email = uniqueAuthEmail('rate-limit')
    const client = createGraphQLTestClient(serverFetch)
    for (let index = 0; index < 3; index++) {
      const res = await client.mutation(
        signInMutation(`Rate${index}`, email, 'password-8-chars'),
      )
      expect(res.signInEmail.__typename).toBe('InvalidCredentialsError')
    }

    const limited = await client.mutation(
      signInMutation('RateOverflow', email, 'password-8-chars'),
    )
    expect(limited.signInEmail.__typename).toBe('RateLimitedError')
  })
})
