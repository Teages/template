import { eq } from 'drizzle-orm'
import { describe } from 'vitest'
import { baseURL, expect, test } from './test-utils'
import { signInWithApiUser } from './utils/auth'
import { useDrizzle } from './utils/db'

describe('drizzle proxy', () => {
  test('reads rows created through the app', async ({ page, context, goto }) => {
    const credentials = await signInWithApiUser(baseURL, context, goto, 'db-proxy')

    const input = page.getByPlaceholder('What needs to be done?')
    await input.fill('DB proxy todo')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('DB proxy todo')).toBeVisible()

    const { db, schema } = useDrizzle()
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, credentials.email))
    if (!user) {
      throw new Error(`expected user ${credentials.email} in the database`)
    }

    const rows = await db.select().from(schema.todos).where(eq(schema.todos.userId, user.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ title: 'DB proxy todo', completed: false })
  })
})
