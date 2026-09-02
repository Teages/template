import { expect, test } from './test-utils'

test.describe('hello page', () => {
  test('renders the hello page server-side', async ({ goto, hydrationErrors }) => {
    const response = await goto('/hello', { waitUntil: 'hydration' })
    const html = await response?.text()

    expect(html).toContain('Hello World')
    expect(hydrationErrors).toEqual([])
  })
})
