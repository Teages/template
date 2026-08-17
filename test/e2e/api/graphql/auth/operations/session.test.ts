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

const sessionQuery = gazania.query('AuthSession')
  .select($ => $.select([{
    session: $ => $.select([
      { user: $ => $.select(['id', 'name', 'email']) },
    ]),
  }]))

describe('query session', () => {
  beforeEach(async () => {
    await resetAuthRateLimits(useAuthRateLimitStorage())
    await resetTestDatabase()
  })

  it('returns null when no session cookie is present', async () => {
    const client = createGraphQLTestClient(serverFetch)
    const res = await client.query(sessionQuery)

    expect(res.session).toBeNull()
  })

  it('returns the signed-in user after signUpEmail sets a cookie', async () => {
    const email = uniqueAuthEmail('session-signup')
    const signUp = await postGraphQL(serverFetch, {
      query: print(gazania.mutation('AuthSessionSignUp')
        .select($ => $.select([{
          signUpEmail: $ => $.args({
            input: {
              name: 'Session User',
              email,
              password: 'password-8-chars',
            },
          }).select([
            '__typename',
            { '... on SignUpEmailPayload': $ => $.select([{ user: $ => $.select(['email']) }]) },
          ]),
        }]))),
    })

    expect(signUp.status).toBe(200)
    expect(signUp.cookie.length).toBeGreaterThan(0)
    expect(JSON.stringify(signUp.json)).not.toContain('token')

    const client = createGraphQLTestClient(serverFetch, { cookie: signUp.cookie })
    const res = await client.query(sessionQuery)
    expect(res.session?.user.email).toBe(email)
    expect(res.session?.user.name).toBe('Session User')
  })
})
