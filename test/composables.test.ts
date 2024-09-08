import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useDouble } from '../src'

describe('package-name/composables', () => {
  it('useDouble', () => {
    const num = ref(2)
    const doubled = useDouble(num)

    expect(doubled.value).toBe(4)

    num.value = 3
    expect(doubled.value).toBe(6)
  })
})
