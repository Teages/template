import type { ConsoleMessage } from '@playwright/test'
import { test as base, expect } from '@nuxt/test-utils/playwright'

const HYDRATION_MISMATCH_PATTERNS = [
  'Hydration completed but contains mismatches',
  'Hydration text content mismatch',
  'Hydration node mismatch',
]

function isHydrationMismatch(message: ConsoleMessage): boolean {
  const text = message.text()
  return HYDRATION_MISMATCH_PATTERNS.some(pattern => text.includes(pattern))
}

export const test = base.extend<{
  hydrationErrors: string[]
}>({
  hydrationErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (isHydrationMismatch(message))
        errors.push(message.text())
    })
    await use(errors)
  },
})

export { expect }
