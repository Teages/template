import { describe, expect, it } from 'vitest'
import { sum } from '../src/utils'

describe('package-name/utils', () => {
  it('sum', () => {
    expect(sum(1, 2, 3)).toBe(6)
  })
})
