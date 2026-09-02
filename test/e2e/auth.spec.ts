import { expect, test } from './test-utils'
import { createTestUserCredentials, signInWithNewUser, signUpWithCredentials } from './utils/auth'

test.describe('Auth', () => {
  test('signs up with email and password', async ({ page, goto, hydrationErrors }) => {
    const credentials = { ...createTestUserCredentials('signup'), name: 'New E2E User' }
    await signUpWithCredentials(page, goto, credentials)

    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible()
    expect(hydrationErrors).toEqual([])
  })

  test('signs in with email and password', async ({ page, baseURL, goto, hydrationErrors }) => {
    await signInWithNewUser(baseURL, page, goto)

    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible()
    expect(hydrationErrors).toEqual([])
  })
})
