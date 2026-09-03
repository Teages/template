import type { Browser, BrowserContext, ConsoleMessage, Page, Response } from '@playwright/test'
import { chromium, expect } from '@playwright/test'
import { test as base } from 'vitest'
import { E2E_BASE_URL, E2E_BROWSER_WS } from './constants'

const HYDRATION_MISMATCH_PATTERNS = [
  'Hydration completed but contains mismatches',
  'Hydration text content mismatch',
  'Hydration node mismatch',
]

function isHydrationMismatch(message: ConsoleMessage): boolean {
  const text = message.text()
  return HYDRATION_MISMATCH_PATTERNS.some(pattern => text.includes(pattern))
}

interface NuxtWindow extends Window {
  useNuxtApp?: () => { isHydrating: boolean }
}

type Goto = (path: string, opts?: { waitUntil: 'hydration' }) => Promise<Response | null>

let browser: Browser | undefined

async function getBrowser(): Promise<Browser> {
  browser ??= await chromium.connect(E2E_BROWSER_WS)
  return browser
}

/** App origin under test; the same value the global setup boots. */
export const baseURL = E2E_BASE_URL

/**
 * Playwright fixtures on vitest: one fresh browser context per test, a
 * hydration-aware `goto`, and hydration-mismatch collection — mirroring the
 * classic `@playwright/test` fixture style.
 */
export const test = base.extend<{
  context: BrowserContext
  page: Page
  goto: Goto
  hydrationErrors: string[]
}>({
  // vitest requires the fixture signature to destructure its first argument
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const browser = await getBrowser()
    const context = await browser.newContext({ baseURL: E2E_BASE_URL })
    await use(context)
    await context.close()
  },

  page: async ({ context }, use) => {
    const page = await context.newPage()
    await use(page)
  },

  goto: async ({ page }, use) => {
    await use(async (path, opts) => {
      const response = await page.goto(path)
      if (opts?.waitUntil === 'hydration') {
        await page.waitForFunction(() => {
          const app = (window as NuxtWindow).useNuxtApp
          return app?.().isHydrating === false
        })
      }
      return response
    })
  },

  hydrationErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (isHydrationMismatch(message))
        errors.push(message.text())
    })
    await use(errors)
  },
})

/** Playwright's expect: locator assertions auto-wait, plain values use chai matchers. */
export { expect }
