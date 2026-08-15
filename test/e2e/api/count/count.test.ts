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

describe('rest /api/count-events', () => {
  beforeEach(async () => {
    // Ensure Nitro's request hook has initialized the in-memory database.
    await serverFetch('/api/auth/get-session')
    await resetTestDatabase()
  })

  it('returns 401 without a session', async () => {
    const getRes = await serverFetch('/api/count-events')
    const postRes = await serverFetch('/api/count-events', {
      method: 'POST',
      headers: { Origin: testOrigin },
    })

    expect(getRes.status).toBe(401)
    expect(postRes.status).toBe(401)
  })

  it('creates a resource and exposes its canonical location', async () => {
    const { cookie } = await signInTestUser('count-one')
    const headers = {
      Origin: testOrigin,
      Cookie: cookie,
    }

    const postRes = await serverFetch('/api/count-events', {
      method: 'POST',
      headers,
    })

    expect(postRes.status).toBe(201)
    const body = await postRes.json() as {
      data: { id: string, userName: string, userEmail: string, createdAt: string }
    }
    expect(body.data.userName).toBe('Vitest User')
    expect(body.data.createdAt.length).toBeGreaterThan(0)
    expect(postRes.headers.get('location')).toBe(`/api/count-events/${body.data.id}`)

    const itemRes = await serverFetch(`/api/count-events/${body.data.id}`, { headers })
    expect(itemRes.status).toBe(200)
    expect(await itemRes.json()).toEqual({ data: body.data })

    const getRes = await serverFetch('/api/count-events', { headers })
    expect(getRes.status).toBe(200)
    const page = await getRes.json() as { data: unknown[], meta: { total: number } }
    expect(page.meta.total).toBe(1)
    expect(page.data).toHaveLength(1)
  })

  it('shows events from multiple users in reverse chronological order', async () => {
    const first = await signInTestUser('count-user-a')
    const firstPost = await serverFetch('/api/count-events', {
      method: 'POST',
      headers: {
        Origin: testOrigin,
        Cookie: first.cookie,
      },
    })
    expect(firstPost.status).toBe(201)

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

    const secondPost = await serverFetch('/api/count-events', {
      method: 'POST',
      headers: {
        Origin: testOrigin,
        Cookie: secondCookie,
      },
    })
    expect(secondPost.status).toBe(201)

    const listRes = await serverFetch('/api/count-events?limit=1', {
      headers: { Cookie: secondCookie },
    })
    const firstPage = await listRes.json() as {
      data: Array<{ id: string, userName: string }>
      meta: { total: number, nextCursor: string | null }
    }
    expect(firstPage.meta.total).toBe(2)
    expect(firstPage.data).toHaveLength(1)
    expect(firstPage.meta.nextCursor).toBeTruthy()

    const secondPage = await serverFetch(
      `/api/count-events?limit=1&cursor=${encodeURIComponent(firstPage.meta.nextCursor!)}`,
      { headers: { Cookie: secondCookie } },
    ).then(res => res.json()) as {
      data: Array<{ id: string, userName: string }>
      meta: { total: number, nextCursor: string | null }
    }
    expect(secondPage.meta.total).toBe(2)
    expect(secondPage.data).toHaveLength(1)
    expect(secondPage.data[0]?.id).not.toBe(firstPage.data[0]?.id)
    expect(secondPage.meta.nextCursor).toBeNull()
  })

  it('rejects invalid pagination parameters', async () => {
    const { cookie } = await signInTestUser('count-invalid-page')
    const headers = { Cookie: cookie }

    expect((await serverFetch('/api/count-events?limit=0', { headers })).status).toBe(400)
    expect((await serverFetch('/api/count-events?cursor=broken', { headers })).status).toBe(400)
  })

  it('rejects a non-UUID id instead of leaking a database error', async () => {
    const { cookie } = await signInTestUser('count-invalid-id')
    const headers = { Cookie: cookie }

    expect(
      (await serverFetch('/api/count-events/not-a-uuid', { headers })).status,
    ).toBe(400)
  })
})
