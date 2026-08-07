import type { PGlite } from '@electric-sql/pglite'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { types } from '@electric-sql/pglite'

const STUDIO_VERSION = '6.3'
const DB_URL = 'pglite://custom-client'

const parsers = {
  [types.TIMESTAMP]: (value: string) => value,
  [types.TIMESTAMPTZ]: (value: string) => value,
  [types.INTERVAL]: (value: string) => value,
  [types.DATE]: (value: string) => value,
}

export const studioCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Access-Control-Request-Private-Network',
  'Access-Control-Allow-Private-Network': 'true',
} as const

export function validateStudioAuthorization(
  authKey: string | undefined,
  authorization: string | null,
): 'not-configured' | 'unauthorized' | undefined {
  if (!authKey)
    return 'not-configured'
  if (authorization !== `Bearer ${authKey}`)
    return 'unauthorized'
  return undefined
}

interface StudioProxyData {
  sql: string
  params?: unknown[]
  mode?: 'array' | 'object'
  method?: 'values' | 'get' | 'all' | 'run' | 'execute'
}

type StudioRequest
  = | { type: 'init' }
    | { type: 'proxy', data: StudioProxyData }
    | { type: 'tproxy', data: Array<{ sql: string, method?: StudioProxyData['method'] }> }
    | { type: 'bproxy', data: { query: StudioProxyData, repeats?: number } }
    | { type: 'defaults', data: Array<{ schema: string, table: string, column: string }> }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSerializedBuffer(
  value: unknown,
): value is { type: 'Buffer', data: number[] } {
  return isRecord(value)
    && value.type === 'Buffer'
    && Array.isArray(value.data)
    && value.data.every(item => typeof item === 'number')
}

function isStudioProxyData(value: unknown): value is StudioProxyData {
  if (!isRecord(value) || typeof value.sql !== 'string')
    return false
  if (value.params !== undefined && !Array.isArray(value.params))
    return false
  if (value.mode !== undefined && value.mode !== 'array' && value.mode !== 'object')
    return false
  return value.method === undefined
    || ['values', 'get', 'all', 'run', 'execute'].includes(String(value.method))
}

function isStudioRequest(value: unknown): value is StudioRequest {
  if (!isRecord(value) || typeof value.type !== 'string')
    return false

  switch (value.type) {
    case 'init':
      return true
    case 'proxy':
      return isStudioProxyData(value.data)
    case 'tproxy':
      return Array.isArray(value.data)
        && value.data.every(item => isRecord(item) && isStudioProxyData(item))
    case 'bproxy':
      return isRecord(value.data)
        && isStudioProxyData(value.data.query)
        && (value.data.repeats === undefined || typeof value.data.repeats === 'number')
    case 'defaults':
      return Array.isArray(value.data)
        && value.data.every(item => isRecord(item)
          && typeof item.schema === 'string'
          && typeof item.table === 'string'
          && typeof item.column === 'string')
    default:
      return false
  }
}

function prepareParams(params: unknown[]): unknown[] {
  return params.map((param) => {
    if (
      param
      && typeof param === 'object'
      && 'type' in param
      && 'value' in param
      && (param as { type: unknown }).type === 'binary'
    ) {
      const value = (param as { value: unknown }).value
      return typeof value === 'object' ? JSON.stringify(value) : value
    }
    return param
  })
}

function studioJson(data: unknown): string {
  return JSON.stringify(data, (_key, value: unknown) => {
    if (value instanceof Error)
      return { error: value.message }
    if (isSerializedBuffer(value))
      return Buffer.from(value.data).toString('base64')
    if (value instanceof ArrayBuffer)
      return Buffer.from(new Uint8Array(value)).toString('base64')
    if (Buffer.isBuffer(value))
      return value.toString('base64')
    return value
  })
}

async function runProxy(client: PGlite, data: StudioProxyData): Promise<unknown> {
  const result = await client.query(
    data.sql,
    prepareParams(data.params || []) as any[],
    {
      rowMode: data.mode ?? 'object',
      parsers,
    },
  )
  return result.rows
}

async function runTransactionProxy(
  client: PGlite,
  queries: Array<{ sql: string }>,
): Promise<unknown[]> {
  const results: unknown[] = []
  try {
    await client.transaction(async (tx) => {
      for (const query of queries) {
        const result = await tx.query(query.sql, undefined, { parsers })
        results.push(result.rows)
      }
    })
  }
  catch (error) {
    results.push(error)
  }
  return results
}

export async function handleStudioProtocol(
  client: PGlite,
  body: unknown,
): Promise<Response> {
  try {
    if (!isStudioRequest(body)) {
      return Response.json({
        status: 'error',
        error: 'Invalid Studio protocol request',
      }, {
        status: 400,
        headers: studioCorsHeaders,
      })
    }

    switch (body.type) {
      case 'init': {
        return Response.json({
          version: STUDIO_VERSION,
          dialect: 'postgresql',
          driver: 'pglite',
          packageName: 'pglite',
          schemaFiles: [],
          customDefaults: [],
          relations: [],
          dbHash: createHash('sha256').update(DB_URL).digest('hex'),
        }, { headers: studioCorsHeaders })
      }
      case 'proxy': {
        const rows = await runProxy(client, body.data)
        return new Response(studioJson(rows), {
          headers: {
            ...studioCorsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }
      case 'tproxy': {
        const rows = await runTransactionProxy(client, body.data)
        return new Response(studioJson(rows), {
          headers: {
            ...studioCorsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }
      case 'bproxy': {
        const repeats = body.data.repeats || 1
        const timings: number[] = []
        for (let i = 0; i < repeats; i++) {
          const start = performance.now()
          await runProxy(client, body.data.query)
          timings.push(performance.now() - start)
        }
        return new Response(studioJson(timings), {
          headers: {
            ...studioCorsHeaders,
            'Content-Type': 'application/json',
          },
        })
      }
      case 'defaults': {
        throw new Error('Custom defaults are not configured for the mock database')
      }
      default: {
        throw new Error(`Unknown Studio protocol type: ${(body as { type: string }).type}`)
      }
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({
      status: 'error',
      error: message,
    }, {
      status: 500,
      headers: studioCorsHeaders,
    })
  }
}
