import type { BrowserContext, Page } from '@playwright/test'
import { createAuthClient } from 'better-auth/client'

/** Shared test password; Better Auth requires at least 8 characters. */
const TEST_PASSWORD = 'password-8-chars'

export interface TestUserCredentials {
  name: string
  email: string
  password: string
}

/** Unique credentials for one test case — each test owns its own user, so no shared state to reset. */
export function createTestUserCredentials(scope: string): TestUserCredentials {
  return {
    name: 'E2E User',
    email: `e2e-${scope}-${crypto.randomUUID()}@test.local`,
    password: TEST_PASSWORD,
  }
}

/**
 * Typed Better Auth client bound to the dev server under test. `onResponse`
 * observes every raw response — used to capture `set-cookie` headers.
 */
export function useE2eAuthClient(baseURL: string, onResponse?: (response: Response) => void) {
  return createAuthClient({
    // Top-level baseURL lets the Node client derive the `/api/auth` base
    // path — inside fetchOptions it would override and break path joining.
    baseURL,
    fetchOptions: {
      disableDefaultFetchPlugins: true,
      // Node's fetch sends `sec-fetch-mode: cors`, which makes Better Auth
      // require a trusted Origin header — the app's own origin is same-origin.
      headers: { Origin: new URL(baseURL).origin },
      customFetchImpl: async (input, init) => {
        const response = await fetch(input, init)
        onResponse?.(response)
        return response
      },
    },
  })
}

/** Signs up and returns the created user plus the session cookies set by the response. */
async function signUpWithEmail(baseURL: string, credentials: TestUserCredentials) {
  let setCookieHeaders: string[] = []
  const authClient = useE2eAuthClient(baseURL, (response) => {
    setCookieHeaders = response.headers.getSetCookie()
  })

  const { data, error } = await authClient.signUp.email(credentials)
  if (error) {
    throw new Error(`Sign-up failed: ${error.status ?? ''} ${error.message ?? 'unknown error'}`)
  }
  if (!data) {
    throw new Error('Sign-up returned no data')
  }

  return { user: data.user, setCookieHeaders }
}

/** Creates a unique user through the real sign-up endpoint. */
export async function signUpViaApi(baseURL: string, credentials: TestUserCredentials) {
  const { user } = await signUpWithEmail(baseURL, credentials)
  return user
}

function toPlaywrightCookies(setCookieHeaders: string[], baseURL: string) {
  return setCookieHeaders.map((header) => {
    const [pair] = header.split(';') as [string, ...string[]]
    const separator = pair.indexOf('=')
    return {
      name: pair.slice(0, separator),
      value: pair.slice(separator + 1),
      url: baseURL,
    }
  })
}

type Goto = (path: string, opts?: { waitUntil: 'hydration' }) => Promise<unknown>

/**
 * Creates a unique user via the API, injects its session into the browser
 * context, and navigates home — skips the auth UI. Sign-up auto-signs-in, so
 * the response's `set-cookie` is already a working session.
 */
export async function signInWithApiUser(
  baseURL: string,
  context: BrowserContext,
  goto: Goto,
  scope: string,
): Promise<TestUserCredentials> {
  const credentials = createTestUserCredentials(scope)
  const { setCookieHeaders } = await signUpWithEmail(baseURL, credentials)

  await context.addCookies(toPlaywrightCookies(setCookieHeaders, baseURL))
  await goto('/', { waitUntil: 'hydration' })
  return credentials
}

export async function signInWithCredentials(page: Page, goto: Goto, credentials: TestUserCredentials): Promise<void> {
  await goto('/sign-in', { waitUntil: 'hydration' })
  await page.getByPlaceholder('you@example.com').fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}

/** Signs a fresh API-created user in through the UI. */
export async function signInWithNewUser(baseURL: string, page: Page, goto: Goto): Promise<void> {
  const credentials = createTestUserCredentials('ui-sign-in')
  await signUpViaApi(baseURL, credentials)
  await signInWithCredentials(page, goto, credentials)
}

export async function signUpWithCredentials(page: Page, goto: Goto, credentials: TestUserCredentials): Promise<void> {
  await goto('/sign-up', { waitUntil: 'hydration' })
  await page.getByPlaceholder('Your name').fill(credentials.name)
  await page.getByPlaceholder('you@example.com').fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('/')
}
