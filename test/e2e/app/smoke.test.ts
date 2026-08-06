import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { fetch } from '~/test/env-runner-bridge.ts'
import { testOrigin } from '~/test/utils'

describe('full stack smoke', () => {
  it('redirects unauthenticated document requests before rendering', async () => {
    const res = await fetch('/', {
      redirect: 'manual',
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/sign-in?redirect=%2F')
  })

  it('serves auth API with the full Vite plugin stack enabled', async () => {
    const res = await serverFetch('/api/auth/get-session', {
      headers: { Origin: testOrigin },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })
})
