import { describe, expect, it } from 'vitest'
import {
  createEmptyPayload,
  parsePayloadScript,
  serializePayloadScript,
} from '~/plugins/vue-ssr/runtime/app/payload'

describe('payload serialize/parse', () => {
  it('round-trips nested objects and Dates', () => {
    const payload = createEmptyPayload()
    payload.pinia.test = {
      error: new Error('cached failure'),
      total: 3,
      at: new Date('2024-06-01T12:00:00.000Z'),
    }

    const script = serializePayloadScript(payload)
    expect(script).toContain('id="__APP_PAYLOAD__"')
    expect(script).toContain('type="application/json"')

    const revived = parsePayloadScript(script)
    const count = revived.pinia.test as {
      error: Error
      total: number
      at: Date
    }
    expect(count.total).toBe(3)
    expect(count.at).toBeInstanceOf(Date)
    expect(count.at.toISOString()).toBe('2024-06-01T12:00:00.000Z')
    expect(count.error).toBeInstanceOf(Error)
    expect(count.error.message).toBe('cached failure')
  })

  it('escapes script-breaking sequences in serialized content', () => {
    const payload = createEmptyPayload()
    payload.pinia.test = {
      evil: '</script><script>alert(1)</script>',
    }

    const script = serializePayloadScript(payload)
    expect(script.toLowerCase()).not.toContain('</script><script>')
    expect(
      (parsePayloadScript(script).pinia.test as { evil: string }).evil,
    ).toBe(
      '</script><script>alert(1)</script>',
    )
  })
})
