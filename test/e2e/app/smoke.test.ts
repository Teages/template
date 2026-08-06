import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'
import { parsePayloadScript } from '~/app/utils/payload.ts'
import { fetch } from '~/test/env-runner-bridge.ts'
import { testOrigin } from '~/test/utils'

describe('full stack smoke', () => {
  it('serves document SSR for GET /', async () => {
    const res = await fetch('/', {
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    const html = await res.text()

    expect(res.status, html.slice(0, 500)).toBe(200)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('id="__APP_PAYLOAD__"')

    const payload = parsePayloadScript(html)
    expect(payload.data['auth:session']).toBeNull()
    // Unauthenticated count fetch fails on purpose; smoke only checks the
    // SSR async-data path ran and serialized an outcome into the payload.
    expect(payload.errors['count-snapshot']).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        message: expect.stringMatching(/unauthorized/i),
      }),
    )
  })

  it('serves auth API with the full Vite plugin stack enabled', async () => {
    const res = await serverFetch('/api/auth/get-session', {
      headers: { Origin: testOrigin },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })
})
