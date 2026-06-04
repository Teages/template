import { signInAsE2eUser, signUpWithCredentials } from './auth-helpers'
import { E2E_TEST_USER } from './e2e-user'
import { expect, test } from './test-utils'

test.describe('Auth', () => {
  test('signs up with email and password', async ({ page, goto, hydrationErrors }) => {
    const email = `e2e-signup-${crypto.randomUUID()}@test.local`
    await signUpWithCredentials(page, goto, {
      name: 'New E2E User',
      email,
      password: E2E_TEST_USER.password,
    })

    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible()
    expect(hydrationErrors).toEqual([])
  })

  test('signs in with email and password', async ({ page, goto, hydrationErrors }) => {
    await signInAsE2eUser(page, goto)

    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible()
    expect(hydrationErrors).toEqual([])
  })
})
