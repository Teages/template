import { describe, expect, it } from 'vitest'
import { createTestUser } from '../../../utils/auth'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import { expectUnauthorizedError, seedTodo } from '../../test-utils'

const TodoQuery = gazania.query('TodoByIdTest')
  .vars({ id: 'ID!' })
  .select(($, vars) => $.select([{
    todo: $ => $.args({ id: vars.id }).select(['id', 'title', 'completed']),
  }]))

describe('todo query', () => {
  it('returns the session user\'s todo by id', async () => {
    const user = await createTestUser()
    const seeded = await seedTodo({ userId: user.userId, title: 'read by id' })

    const { todo } = await user.api(TodoQuery, { id: seeded.id })

    expect(todo?.id).toBe(seeded.id)
    expect(todo?.title).toBe('read by id')
    expect(todo?.completed).toBe(false)
  })

  it('returns null for a todo that does not exist', async () => {
    const user = await createTestUser()

    const { todo } = await user.api(TodoQuery, { id: crypto.randomUUID() })

    expect(todo).toBeNull()
  })

  it('returns null for another user\'s todo', async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    const seeded = await seedTodo({ userId: owner.userId, title: 'not yours' })

    const { todo } = await other.api(TodoQuery, { id: seeded.id })

    expect(todo).toBeNull()
  })

  it('rejects without a session', async () => {
    const owner = await createTestUser()
    const seeded = await seedTodo({ userId: owner.userId, title: 'hidden' })

    await expectUnauthorizedError(requestGraphQL(TodoQuery, { id: seeded.id }))
  })
})
