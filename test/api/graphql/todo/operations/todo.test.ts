import { describe, expect, it } from 'vitest'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import { createSessionUser, expectUnauthorizedError, seedTodo } from '../../test-utils'

const TodoQuery = gazania.query('TodoByIdTest')
  .vars({ id: 'ID!' })
  .select(($, vars) => $.select([{
    todo: $ => $.args({ id: vars.id }).select(['id', 'title', 'completed']),
  }]))

describe('todo query', () => {
  it('returns the session user\'s todo by id', async () => {
    const user = await createSessionUser('todo-query')
    const seeded = await seedTodo({ userId: user.userId, title: 'read by id' })

    const { todo } = await requestGraphQL(TodoQuery, { id: seeded.id }, { cookie: user.cookie })

    expect(todo?.id).toBe(seeded.id)
    expect(todo?.title).toBe('read by id')
    expect(todo?.completed).toBe(false)
  })

  it('returns null for a todo that does not exist', async () => {
    const user = await createSessionUser('todo-query-missing')

    const { todo } = await requestGraphQL(
      TodoQuery,
      { id: crypto.randomUUID() },
      { cookie: user.cookie },
    )

    expect(todo).toBeNull()
  })

  it('returns null for another user\'s todo', async () => {
    const owner = await createSessionUser('todo-query-owner')
    const other = await createSessionUser('todo-query-other')
    const seeded = await seedTodo({ userId: owner.userId, title: 'not yours' })

    const { todo } = await requestGraphQL(TodoQuery, { id: seeded.id }, { cookie: other.cookie })

    expect(todo).toBeNull()
  })

  it('rejects without a session', async () => {
    const owner = await createSessionUser('todo-query-unauth')
    const seeded = await seedTodo({ userId: owner.userId, title: 'hidden' })

    await expectUnauthorizedError(requestGraphQL(TodoQuery, { id: seeded.id }))
  })
})
