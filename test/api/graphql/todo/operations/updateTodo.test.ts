import { describe, expect, it } from 'vitest'
import { createTestUser } from '../../../utils/auth'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import { expectUnauthorizedError, seedTodo } from '../../test-utils'

const UpdateTodoMutation = gazania.mutation('UpdateTodoTest')
  .vars({ input: 'UpdateTodoInput!' })
  .select(($, vars) => $.select([{
    updateTodo: $ => $.args({ input: vars.input }).select(['id', 'title', 'completed']),
  }]))

const TodoQuery = gazania.query('UpdateTodoProbe')
  .vars({ id: 'ID!' })
  .select(($, vars) => $.select([{
    todo: $ => $.args({ id: vars.id }).select(['title', 'completed']),
  }]))

describe('updateTodo mutation', () => {
  it('updates the title and keeps the other fields', async () => {
    const user = await createTestUser()
    const seeded = await seedTodo({ userId: user.userId, title: 'before' })

    const { updateTodo } = await user.api(
      UpdateTodoMutation,
      { input: { id: seeded.id, title: '  after  ' } },
    )

    expect(updateTodo?.id).toBe(seeded.id)
    expect(updateTodo?.title).toBe('after')
    expect(updateTodo?.completed).toBe(false)
  })

  it('updates completed without touching the title', async () => {
    const user = await createTestUser()
    const seeded = await seedTodo({ userId: user.userId, title: 'keep title' })

    const { updateTodo } = await user.api(
      UpdateTodoMutation,
      { input: { id: seeded.id, completed: true } },
    )

    expect(updateTodo?.id).toBe(seeded.id)
    expect(updateTodo?.title).toBe('keep title')
    expect(updateTodo?.completed).toBe(true)
  })

  it('returns null when no field is given to update', async () => {
    const user = await createTestUser()
    const seeded = await seedTodo({ userId: user.userId, title: 'unchanged' })

    const { updateTodo } = await user.api(UpdateTodoMutation, { input: { id: seeded.id } })

    expect(updateTodo).toBeNull()
  })

  it('returns null for a todo that does not exist', async () => {
    const user = await createTestUser()

    const { updateTodo } = await user.api(
      UpdateTodoMutation,
      { input: { id: crypto.randomUUID(), title: 'ghost' } },
    )

    expect(updateTodo).toBeNull()
  })

  it('cannot update another user\'s todo', async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    const seeded = await seedTodo({ userId: owner.userId, title: 'original' })

    const { updateTodo } = await other.api(
      UpdateTodoMutation,
      { input: { id: seeded.id, title: 'hijacked' } },
    )
    expect(updateTodo).toBeNull()

    const { todo } = await owner.api(TodoQuery, { id: seeded.id })
    expect(todo?.title).toBe('original')
  })

  it('rejects without a session', async () => {
    const owner = await createTestUser()
    const seeded = await seedTodo({ userId: owner.userId, title: 'hidden' })

    await expectUnauthorizedError(requestGraphQL(
      UpdateTodoMutation,
      { input: { id: seeded.id, title: 'anonymous' } },
    ))
  })
})
