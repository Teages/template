import { describe, expect, it } from 'vitest'
import { parsePayloadScript } from '~/app/utils/payload.ts'
import { fetch } from '~/test/env-runner-bridge.ts'
import { testOrigin } from '~/test/utils'

describe('trpc demo page SSR', () => {
  it('renders the /trpc page with the greet demo section', async () => {
    const res = await fetch('/trpc', {
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    const html = await res.text()

    expect(res.status, html.slice(0, 500)).toBe(200)
    expect(html).toContain('tRPC Demo')
    expect(html).toContain('greet.greet')
    expect(html).toContain('count.snapshot')
  })

  it('serializes the unauthenticated count error into the SSR payload', async () => {
    const res = await fetch('/trpc', {
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    const html = await res.text()

    const payload = parsePayloadScript(html)
    // The count snapshot runs during SSR; without a session it should fail
    // with an UNAUTHORIZED-style error, mirroring the smoke test on /.
    expect(payload.errors['trpc-count-snapshot']).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        message: expect.stringMatching(/sign in|unauthorized/i),
      }),
    )
  })

  it('shows the tRPC nav link on the home page', async () => {
    const res = await fetch('/', {
      headers: {
        Origin: testOrigin,
        Accept: 'text/html',
      },
    })
    const html = await res.text()

    expect(html).toContain('href="/trpc"')
  })
})
