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

describe('mutation signOut', () => {
  beforeEach(async () => {
    await resetAuthRateLimits(useAuthRateLimitStorage())
    await resetTestDatabase()
  })

  it('clears the session cookie so a later session query is null', async () => {
    const email = uniqueAuthEmail('sign-out')
    const signUp = await postGraphQL(serverFetch, {
      query: print(gazania.mutation('AuthSignOutSignUp')
        .select($ => $.select([{
          signUpEmail: $ => $.args({
            input: {
              name: 'Sign Out User',
              email,
              password: 'password-8-chars',
            },
          }).select([
            '__typename',
            { '... on SignUpEmailPayload': $ => $.select([{ user: $ => $.select(['email']) }]) },
          ]),
        }]))),
    })
    expect(signUp.cookie.length).toBeGreaterThan(0)

    const signedOut = await postGraphQL(serverFetch, {
      query: print(gazania.mutation('AuthSignOut')
        .select($ => $.select([{
          signOut: $ => $.select([
            '__typename',
            { '... on SignOutPayload': $ => $.select(['ok']) },
          ]),
        }]))),
    }, { cookie: signUp.cookie })

    expect(signedOut.status).toBe(200)
    const body = signedOut.json as {
      data: { signOut: { __typename: string, ok?: boolean } }
    }
    expect(body.data.signOut.__typename).toBe('SignOutPayload')
    expect(body.data.signOut.ok).toBe(true)

    const client = createGraphQLTestClient(serverFetch, { cookie: signUp.cookie })
    const session = await client.query(
      gazania.query('AuthSignOutSession')
        .select($ => $.select([{
          session: $ => $.select([{ user: $ => $.select(['email']) }]),
        }])),
    )
    expect(session.session).toBeNull()
  })
})
