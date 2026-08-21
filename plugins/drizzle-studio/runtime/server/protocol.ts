import type { StudioDatabase, StudioQueryClient } from './query.ts'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { isRecord } from '~/server/utils/predicates.ts'
import { runStudioQuery, runStudioTransaction } from './query.ts'

const STUDIO_VERSION = '6.3'
const STUDIO_DB_ID = 'drizzle://studio'

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

function assertNever(value: never): never {
  throw new Error(`Unknown Studio protocol type: ${JSON.stringify(value)}`)
}

function studioJson(data: unknown): string {
  return JSON.stringify(data, (_key, value: unknown) => {
    if (value instanceof Error)
      return { error: value.message }
    if (value instanceof Date)
      return value.toISOString()
    if (isSerializedBuffer(value))
      return Buffer.from(value.data).toString('base64')
    if (value instanceof ArrayBuffer)
      return Buffer.from(new Uint8Array(value)).toString('base64')
    if (Buffer.isBuffer(value))
      return value.toString('base64')
    return value
  })
}

function studioRowsResponse(rows: unknown): Response {
  return new Response(studioJson(rows), {
    headers: {
      ...studioCorsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export async function handleStudioProtocol<TTx extends StudioQueryClient>(
  db: StudioDatabase<TTx>,
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
          driver: 'drizzle-orm',
          packageName: 'drizzle-orm',
          schemaFiles: [],
          customDefaults: [],
          relations: [],
          dbHash: createHash('sha256').update(STUDIO_DB_ID).digest('hex'),
        }, { headers: studioCorsHeaders })
      }
      case 'proxy': {
        return studioRowsResponse(await runStudioQuery(db, body.data))
      }
      case 'tproxy': {
        return studioRowsResponse(await runStudioTransaction(db, body.data))
      }
      case 'bproxy': {
        const repeats = body.data.repeats || 1
        const timings: number[] = []
        for (let i = 0; i < repeats; i++) {
          const start = performance.now()
          await runStudioQuery(db, body.data.query)
          timings.push(performance.now() - start)
        }
        return studioRowsResponse(timings)
      }
      case 'defaults': {
        throw new Error('Custom defaults are not configured')
      }
      default: {
        return assertNever(body)
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
