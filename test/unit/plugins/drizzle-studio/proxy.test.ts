import { getPort } from 'get-port-please'
import { createServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { replaceStudioProxy } from '~/plugins/drizzle-studio/proxy'

describe('drizzle studio proxy', () => {
  it('forwards requests without installing process shutdown handlers', async () => {
    // Given
    const sigintListeners = process.listenerCount('SIGINT')
    const sigtermListeners = process.listenerCount('SIGTERM')
    vi.stubEnv('TEST', '')
    let forwardedRequest: Request | undefined
    const vite = await createServer({
      configFile: false,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
      },
    })
    Object.defineProperty(vite.environments, 'nitro', {
      configurable: true,
      value: {
        async dispatchFetch(request: Request): Promise<Response> {
          forwardedRequest = request
          return new Response(await request.text(), {
            status: 201,
            headers: {
              'x-proxy-response': 'forwarded',
            },
          })
        },
      },
    })
    await vite.listen()

    try {
      const proxyPort = await getPort({
        portRange: [5200, 5299],
      })
      await replaceStudioProxy(
        vite,
        proxyPort,
        'studio-key',
        '/api/drizzle-studio',
      )

      // When
      const response = await fetch(
        `http://127.0.0.1:${proxyPort}/ignored?query=discarded`,
        {
          method: 'POST',
          headers: {
            'authorization': 'Bearer untrusted-client-key',
            'content-type': 'application/json',
          },
          body: '{"type":"init"}',
        },
      )

      // Then
      expect(response.status).toBe(201)
      expect(response.headers.get('x-proxy-response')).toBe('forwarded')
      await expect(response.text()).resolves.toBe('{"type":"init"}')
      expect(forwardedRequest?.url).toBe(
        'http://drizzle-studio.local/api/drizzle-studio',
      )
      expect(forwardedRequest?.headers.get('authorization')).toBe(
        'Bearer studio-key',
      )
      expect(forwardedRequest?.headers.has('host')).toBe(false)
      expect(forwardedRequest?.headers.has('connection')).toBe(false)
    }
    finally {
      await vite.close()
      vi.unstubAllEnvs()
    }
    expect(process.listenerCount('SIGINT')).toBe(sigintListeners)
    expect(process.listenerCount('SIGTERM')).toBe(sigtermListeners)
  })
})
