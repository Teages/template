import { describe, expect, it } from 'vitest'
import { createEmptyPayload } from '~/app/utils/app-context.ts'
import {
  parsePayloadScript,
  serializePayloadScript,
} from '~/app/utils/payload.ts'

describe('payload serialize/parse', () => {
  it('round-trips nested objects and Dates', () => {
    const payload = createEmptyPayload()
    payload.data.count = {
      total: 3,
      at: new Date('2024-06-01T12:00:00.000Z'),
    }
    payload.state.theme = 'dark'

    const script = serializePayloadScript(payload)
    expect(script).toContain('id="__APP_PAYLOAD__"')
    expect(script).toContain('type="application/json"')

    const revived = parsePayloadScript(script)
    expect(revived.state.theme).toBe('dark')
    const count = revived.data.count as { total: number, at: Date }
    expect(count.total).toBe(3)
    expect(count.at).toBeInstanceOf(Date)
    expect(count.at.toISOString()).toBe('2024-06-01T12:00:00.000Z')
  })

  it('escapes script-breaking sequences in serialized content', () => {
    const payload = createEmptyPayload()
    payload.data.evil = '</script><script>alert(1)</script>'

    const script = serializePayloadScript(payload)
    expect(script.toLowerCase()).not.toContain('</script><script>')
    expect(parsePayloadScript(script).data.evil).toBe(
      '</script><script>alert(1)</script>',
    )
  })
})
