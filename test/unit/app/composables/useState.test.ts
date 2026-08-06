import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { useState } from '~/app/composables/useState.ts'
import {
  APP_CONTEXT_KEY,
  createAppContext,
  createEmptyPayload,
} from '~/app/utils/app-context.ts'

function withAppContext<T>(
  run: () => T,
  init?: Parameters<typeof createAppContext>[0],
): T {
  const app = createApp({ render: () => null })
  const ctx = createAppContext(init)
  app.provide(APP_CONTEXT_KEY, ctx)
  return app.runWithContext(run)
}

describe('useState', () => {
  it('returns the same Ref for the same key', () => {
    withAppContext(() => {
      const a = useState('counter', () => 1)
      const b = useState<number>('counter')
      expect(a).toBe(b)
      a.value = 5
      expect(b.value).toBe(5)
    })
  })

  it('revives values from the payload without re-running init', () => {
    const payload = createEmptyPayload()
    payload.state.theme = 'dark'

    withAppContext(() => {
      const theme = useState('theme', () => 'light')
      expect(theme.value).toBe('dark')
    }, { payload })
  })
})
