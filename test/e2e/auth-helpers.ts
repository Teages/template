import type { Page } from '@playwright/test'
import { seedE2eUser } from './auth-api'
import { E2E_TEST_USER } from './e2e-user'

type Goto = (path: string, opts?: { waitUntil: 'hydration' }) => Promise<unknown>

export async function signInAsE2eUser(page: Page, goto: Goto): Promise<void> {
  await seedE2eUser()

  await goto('/sign-in', { waitUntil: 'hydration' })
  await page.getByPlaceholder('you@example.com').fill(E2E_TEST_USER.email)
  await page.locator('input[type="password"]').fill(E2E_TEST_USER.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}

export async function signUpWithCredentials(
  page: Page,
  goto: Goto,
  credentials: { name: string, email: string, password: string },
): Promise<void> {
  await goto('/sign-up', { waitUntil: 'hydration' })
  await page.getByPlaceholder('Your name').fill(credentials.name)
  await page.getByPlaceholder('you@example.com').fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('/')
}
