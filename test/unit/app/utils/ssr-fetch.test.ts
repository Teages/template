import { describe, expect, it, vi } from 'vitest'
import { createSsrFetchContext } from '~/app/utils/ssr-fetch.ts'

function createHarness() {
  const calls: Array<{ input: RequestInfo | URL, init?: RequestInit }> = []
  const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof globalThis.fetch
  const request = new Request('https://app.example/dashboard', {
    headers: { Cookie: 'session=secret' },
  })

  return {
    ...createSsrFetchContext(request, transport),
    calls,
  }
}

function lastCallHeaders(calls: Array<{ init?: RequestInit }>): Headers {
  const call = calls.at(-1)
  if (!call)
    throw new Error('Expected a fetch call')
  return new Headers(call.init?.headers)
}

describe('createSsrFetchContext', () => {
  it('keeps plain $fetch credential-free for internal requests', async () => {
    const { $fetch, calls } = createHarness()

    await $fetch('/api/session')

    expect(String(calls[0]?.input)).toBe('https://app.example/api/session')
    expect(lastCallHeaders(calls).has('cookie')).toBe(false)
  })

  it('forwards the request cookie through $requestFetch to internal paths', async () => {
    const { $requestFetch, calls } = createHarness()

    await $requestFetch('/api/session')

    expect(String(calls[0]?.input)).toBe('https://app.example/api/session')
    expect(lastCallHeaders(calls).get('cookie')).toBe('session=secret')
  })

  it.each([
    'https://external.example/data',
    'https://app.example/api/session',
    '//external.example/data',
  ])('does not inherit cookies for non-internal target %s', async (target) => {
    const { $requestFetch, calls } = createHarness()

    await $requestFetch(target)

    expect(lastCallHeaders(calls).has('cookie')).toBe(false)
  })

  it('preserves an explicitly supplied cookie for a trusted external request', async () => {
    const { $requestFetch, calls } = createHarness()

    await $requestFetch('https://trusted.example/data', {
      headers: { Cookie: 'service=explicit' },
    })

    expect(lastCallHeaders(calls).get('cookie')).toBe('service=explicit')
  })
})
