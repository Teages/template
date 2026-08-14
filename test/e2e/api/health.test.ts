import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'

describe('get /api/health', () => {
  it('returns ok without requiring a session', async () => {
    const res = await serverFetch('/api/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
