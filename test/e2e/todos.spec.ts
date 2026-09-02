import { expect, test } from './test-utils'
import { signInWithApiUser } from './utils/auth'

test.describe('Todos page', () => {
  test('shows the empty state', async ({ page, context, baseURL, goto, hydrationErrors }) => {
    await signInWithApiUser(baseURL, context, goto, 'todos-empty')

    await expect(page.getByText('No todos yet')).toBeVisible()
    expect(hydrationErrors).toEqual([])
  })

  test('creates, completes, and deletes a todo', async ({ page, context, baseURL, goto, hydrationErrors }) => {
    await signInWithApiUser(baseURL, context, goto, 'todos-crud')

    const input = page.getByPlaceholder('What needs to be done?')
    await input.fill('E2E todo')
    await page.getByRole('button', { name: 'Add' }).click()

    await expect(page.getByText('E2E todo')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark complete' }).click()
    await expect(page.getByText('E2E todo')).toHaveClass(/line-through/)

    await page.getByRole('button', { name: 'Delete todo' }).click()
    await expect(page.getByText('No todos yet')).toBeVisible()

    expect(hydrationErrors).toEqual([])
  })
})
