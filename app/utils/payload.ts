import type { AppPayload } from './app-context'
import { parse, stringify } from 'devalue'
import {
  APP_PAYLOAD_ELEMENT_ID,

  createEmptyPayload,
} from './app-context'

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

  const data = isRecord(value.data) ? value.data : {}
  const state = isRecord(value.state) ? value.state : {}
  const errors = isRecord(value.errors)
    ? value.errors as AppPayload['errors']
    : {}

  return { data, state, errors }
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
  const body = escapePayloadText(stringify(payload))
  return `<script type="application/json" id="${APP_PAYLOAD_ELEMENT_ID}">${body}</script>`
}

export function parsePayloadScript(scriptHtml: string): AppPayload {
  const match = scriptHtml.match(
    new RegExp(
      `<script[^>]*\\bid="${APP_PAYLOAD_ELEMENT_ID}"[^>]*>([\\s\\S]*?)</script>`,
      'i',
    ),
  )
  if (!match?.[1]) {
    throw new TypeError('App payload script not found')
  }
  return parseAppPayload(parse(unescapePayloadText(match[1])))
}

export function readPayloadFromDocument(
  doc?: PayloadDocument,
): AppPayload {
  const target = doc ?? getBrowserDocument()
  const el = target.getElementById(APP_PAYLOAD_ELEMENT_ID)
  if (!el?.textContent) {
    return createEmptyPayload()
  }
  const payload = parseAppPayload(parse(unescapePayloadText(el.textContent)))
  el.remove()
  return payload
}

function getBrowserDocument(): PayloadDocument {
  const browserGlobal = globalThis as typeof globalThis & {
    document?: PayloadDocument
  }
  if (!browserGlobal.document)
    throw new TypeError('Document is not available')
  return browserGlobal.document
}
