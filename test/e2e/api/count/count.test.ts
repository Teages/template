import { serverFetch } from 'nitro/app'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  cookieHeader,
  jsonHeaders,
  resetTestDatabase,
  signInTestUser,
  testOrigin,
  uniqueAuthEmail,
} from '~/test/utils'

describe('count /api/count', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('returns 401 when posting without a session', async () => {
    const res = await serverFetch('/api/count', {
      method: 'POST',
      headers: { Origin: testOrigin },
    })

    expect(res.status).toBe(401)
  })

  it('records a count event for the signed-in user', async () => {
    const { cookie } = await signInTestUser('count-one')
    const headers = {
      Origin: testOrigin,
      Cookie: cookie,
    }

    const postRes = await serverFetch('/api/count', {
      method: 'POST',
      headers,
    })

    expect(postRes.status).toBe(200)
    const body = await postRes.json() as {
      count: number
      events: Array<{ userName: string, userEmail: string, createdAt: string }>
    }
    expect(body.count).toBe(1)
    expect(body.events).toHaveLength(1)
    expect(body.events[0]?.userName).toBe('Vitest User')
    expect(body.events[0]?.createdAt.length).toBeGreaterThan(0)

    const getRes = await serverFetch('/api/count', { headers })
    expect(getRes.status).toBe(200)
    const snapshot = await getRes.json() as { count: number }
    expect(snapshot.count).toBe(1)
  })

  it('shows events from multiple users in reverse chronological order', async () => {
    const first = await signInTestUser('count-user-a')
    const firstPost = await serverFetch('/api/count', {
      method: 'POST',
      headers: {
        Origin: testOrigin,
        Cookie: first.cookie,
      },
    })
    expect(firstPost.status).toBe(200)

    const email = uniqueAuthEmail('count-user-b')
    const signUpRes = await serverFetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: 'Second User',
        email,
        password: 'password-8-chars',
      }),
    })
    expect(signUpRes.status).toBe(200)
    const secondCookie = cookieHeader(signUpRes)

    const secondPost = await serverFetch('/api/count', {
      method: 'POST',
      headers: {
        Origin: testOrigin,
        Cookie: secondCookie,
      },
    })
    expect(secondPost.status).toBe(200)

    const body = await secondPost.json() as {
      count: number
      events: Array<{ userName: string }>
    }
    expect(body.count).toBe(2)
    expect(body.events.map(event => event.userName)).toEqual(['Second User', 'Vitest User'])
  })
})
