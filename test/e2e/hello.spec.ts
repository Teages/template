import { describe } from 'vitest'
import { expect, test } from './test-utils'

describe('hello page', () => {
  test('renders the hello page server-side', async ({ goto, hydrationErrors }) => {
    const response = await goto('/hello', { waitUntil: 'hydration' })
    const html = await response?.text()

    expect(html).toContain('Hello World')
    expect(hydrationErrors).toEqual([])
  })
})
