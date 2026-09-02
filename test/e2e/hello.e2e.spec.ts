import { $fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('get /hello', () => {
  it('renders the hello page server-side', async () => {
    const html = await $fetch<string>('/hello')
    expect(html).toContain('Hello World')
  })
})
