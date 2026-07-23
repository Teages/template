import { request } from 'node:http'
import type { IncomingMessage } from 'node:http'
import {
  getHeaders,
  isMethod,
  readRawBody,
  setResponseStatus,
} from 'nitro/h3'
import type { H3Event } from 'nitro/h3'

// Workaround for a Nuxt 5 nightly + Nitro 3 beta regression: Nuxt's
// `fetch.server.mjs` reassigns `globalThis.fetch` to Nitro's internal
// `serverFetch`. Nitro's routeRules proxy then calls bare `fetch(target)` to
// forward the request — but that resolves to `serverFetch`, which dispatches
// back into the local app, re-matches the same proxy rule and blows the stack
// with `Maximum call stack size exceeded`. We sidestep routeRules proxy and
// forward via `node:http`, which is unaffected by the globalThis.fetch override.

const backendOrigin = process.env.NUXT_BACKEND_ORIGIN ?? 'http://localhost:20398'

const FORWARD_HEADERS = [
  'accept',
  'accept-encoding',
  'accept-language',
  'authorization',
  'content-type',
  'content-length',
  'cookie',
  'user-agent',
] as const

const HOP_BY_HOP = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'upgrade',
])

export interface ProxyOptions {
  /** Path under the backend origin (e.g. `/api/auth/get-session` or `/graphql`). */
  path: string
}

export async function proxyToBackend(event: H3Event, opts: ProxyOptions) {
  const url = new URL(opts.path, backendOrigin)

  const inbound = getHeaders(event) as Record<string, string>
  const forwardHeaders: Record<string, string> = {}
  for (const key of FORWARD_HEADERS) {
    if (inbound[key]) forwardHeaders[key] = inbound[key]
  }

  const body = isMethod(event, 'GET', 'HEAD')
    ? undefined
    : (await readRawBody(event, false)) as Buffer | undefined

  let upstream: { status: number, headers: Record<string, string | string[]>, body: Buffer }
  try {
    upstream = await new Promise((resolve, reject) => {
      const req = request(url, { method: event.method, headers: forwardHeaders }, (res: IncomingMessage) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const grouped: Record<string, string | string[]> = {}
          for (let i = 0; i < res.rawHeaders.length; i += 2) {
            const k = res.rawHeaders[i]!.toLowerCase()
            const v = res.rawHeaders[i + 1]!
            if (HOP_BY_HOP.has(k)) continue
            if (k in grouped) {
              const existing = grouped[k]
              grouped[k] = Array.isArray(existing) ? [...existing, v] : [existing as string, v]
            }
            else {
              grouped[k] = v
            }
          }
          resolve({
            status: res.statusCode ?? 502,
            headers: grouped,
            body: Buffer.concat(chunks),
          })
        })
        res.on('error', reject)
      })
      req.on('error', reject)
      if (body && body.length > 0) req.write(body)
      req.end()
    })
  }
  catch (error) {
    setResponseStatus(event, 502)
    return { error: true, message: 'Bad gateway', cause: (error as Error).message }
  }

  setResponseStatus(event, upstream.status)
  for (const [k, v] of Object.entries(upstream.headers)) {
    if (Array.isArray(v)) {
      for (const item of v) event.res.headers.append(k, item)
    }
    else {
      event.res.headers.set(k, v)
    }
  }
  return upstream.body
}
