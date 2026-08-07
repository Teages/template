import { describe, expect, it } from 'vitest'
import {
  handleStudioProtocol,
  validateStudioAuthorization,
} from '~/server/utils/drizzle-studio-protocol'

describe('validateStudioAuthorization', () => {
  it('reports an unavailable key as not configured', () => {
    expect(validateStudioAuthorization(undefined, null)).toBe('not-configured')
  })

  it('rejects missing or incorrect authorization', () => {
    expect(validateStudioAuthorization('studio-key', null)).toBe('unauthorized')
    expect(validateStudioAuthorization('studio-key', 'Bearer wrong-key')).toBe('unauthorized')
  })

  it('accepts the proxy authorization', () => {
    expect(validateStudioAuthorization('studio-key', 'Bearer studio-key')).toBeUndefined()
  })
})

describe('handleStudioProtocol', () => {
  it('rejects malformed protocol requests', async () => {
    const response = await handleStudioProtocol(null as never, {})

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      status: 'error',
      error: 'Invalid Studio protocol request',
    })
  })

  it('accepts the initialization request without querying the database', async () => {
    const response = await handleStudioProtocol(null as never, { type: 'init' })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      version: '6.3',
      dialect: 'postgresql',
      driver: 'pglite',
    })
  })
})
