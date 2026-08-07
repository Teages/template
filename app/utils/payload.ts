import type { serializeQueryCache } from '@pinia/colada'
import type { StateTree } from 'pinia'
import { parse, stringify } from 'devalue'

export const APP_PAYLOAD_ELEMENT_ID = '__APP_PAYLOAD__' as const

export interface AppPayload {
  pinia: StateTree
  queryCache: ReturnType<typeof serializeQueryCache>
}

interface PayloadElement {
  readonly textContent: string | null
  remove: () => void
}

interface PayloadDocument {
  getElementById: (id: string) => PayloadElement | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseAppPayload(value: unknown): AppPayload {
  if (!isRecord(value)) {
    throw new TypeError('Invalid app payload: expected object')
  }

  return {
    pinia: isRecord(value.pinia) ? value.pinia : {},
    queryCache: isRecord(value.queryCache)
      ? value.queryCache as AppPayload['queryCache']
      : {},
  }
}

export function createEmptyPayload(): AppPayload {
  return {
    pinia: {},
    queryCache: {},
  }
}

/** Escape so serialized JSON cannot close the surrounding script tag. */
function escapePayloadText(text: string): string {
  return text
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function unescapePayloadText(text: string): string {
  return text
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\u2028/g, '\u2028')
    .replace(/\\u2029/g, '\u2029')
}

export function serializePayloadScript(payload: AppPayload): string {
  const body = escapePayloadText(stringify(payload, {
    Error: value => value instanceof Error && [value.name, value.message],
  }))
  return `<script type="application/json" id="${APP_PAYLOAD_ELEMENT_ID}">${body}</script>`
}

export function parsePayloadScript(scriptHtml: string): AppPayload {
  const match = scriptHtml.match(
    new RegExp(
      `<script type="application/json" id="${APP_PAYLOAD_ELEMENT_ID}">([\\s\\S]*?)</script>`,
      'i',
    ),
  )
  if (!match?.[1]) {
    throw new TypeError('App payload script not found')
  }
  return parseAppPayload(parsePayloadText(match[1]))
}

export function readPayloadFromDocument(
  doc?: PayloadDocument,
): AppPayload {
  const target = doc ?? getBrowserDocument()
  const el = target.getElementById(APP_PAYLOAD_ELEMENT_ID)
  if (!el?.textContent) {
    return createEmptyPayload()
  }
  const payload = parseAppPayload(parsePayloadText(el.textContent))
  el.remove()
  return payload
}

function parsePayloadText(text: string): unknown {
  return parse(unescapePayloadText(text), {
    Error: (value: [name: string, message: string]) => {
      const error = new Error(value[1])
      error.name = value[0]
      return error
    },
  })
}

function getBrowserDocument(): PayloadDocument {
  const browserGlobal = globalThis as typeof globalThis & {
    document?: PayloadDocument
  }
  if (!browserGlobal.document)
    throw new TypeError('Document is not available')
  return browserGlobal.document
}
