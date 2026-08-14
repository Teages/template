import { describe, expect, it } from 'vitest'
import { formatWhen } from '~/app/utils/format-when'

describe('formatWhen', () => {
  it('formats ISO timestamps in UTC so SSR and client renders agree', () => {
    // 2026-08-14T23:04:05Z is already Aug 15 in Asia/Shanghai: without
    // `timeZone: 'UTC'` a non-UTC machine renders a different day.
    const iso = '2026-08-14T23:04:05.678Z'
    expect(formatWhen(iso)).toBe('Aug 14, 2026, 11:04 PM')
    expect(formatWhen(iso, 'medium')).toBe('Aug 14, 2026, 11:04:05 PM')
  })
})
