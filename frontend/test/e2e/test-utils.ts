import type { ConsoleMessage } from '@playwright/test'
import { test as base, expect } from '@nuxt/test-utils/playwright'

const backendResetURL = 'http://localhost:20398/_nitro/tasks/db:reset'

const HYDRATION_MISMATCH_PATTERNS = [
  'Hydration completed but contains mismatches',
  'Hydration text content mismatch',
  'Hydration node mismatch',
]

function isHydrationMismatch(message: ConsoleMessage): boolean {
  const text = message.text()
  return HYDRATION_MISMATCH_PATTERNS.some(pattern => text.includes(pattern))
}

async function resetBackendDatabase(): Promise<void> {
  const response = await fetch(backendResetURL, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`Failed to reset backend database: ${response.status} ${response.statusText}`)
  }
}

export const test = base.extend<{
  resetBackend: void
  hydrationErrors: string[]
}>({
  resetBackend: [
    async (_, use) => {
      await resetBackendDatabase()
      await use()
    },
    { auto: true },
  ],

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
