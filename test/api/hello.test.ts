import { serverFetch } from 'nitro/app'
import { describe, expect, it } from 'vitest'

describe('get /api/hello', () => {
  it('should return a hello message', async () => {
    const response = await serverFetch('/api/hello').then(res => res.json())
    expect(response).toEqual({ message: 'Hello, world!' })
  })
})
