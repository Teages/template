import { describe, expect, it } from 'vitest'
import { createTestUser } from '../../../utils/auth'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import { expectUnauthorizedError, seedTodo } from '../../test-utils'

const DeleteTodoMutation = gazania.mutation('DeleteTodoTest')
  .vars({ input: 'DeleteTodoInput!' })
  .select(($, vars) => $.select([{
    deleteTodo: $ => $.args({ input: vars.input }).select(['success', 'id']),
  }]))

const TodoQuery = gazania.query('DeleteTodoProbe')
  .vars({ id: 'ID!' })
  .select(($, vars) => $.select([{
    todo: $ => $.args({ id: vars.id }).select(['id']),
  }]))

describe('deleteTodo mutation', () => {
  it('deletes the session user\'s todo', async () => {
    const user = await createTestUser()
    const kept = await seedTodo({ userId: user.userId, title: 'kept' })
    const removed = await seedTodo({ userId: user.userId, title: 'removed' })

    const { deleteTodo } = await user.api(DeleteTodoMutation, { input: { id: removed.id } })

    expect(deleteTodo?.success).toBe(true)
    expect(deleteTodo?.id).toBe(removed.id)

    const { todo } = await user.api(TodoQuery, { id: removed.id })
    expect(todo).toBeNull()

    const keptView = await user.api(TodoQuery, { id: kept.id })
    expect(keptView.todo?.id).toBe(kept.id)
  })

  it('returns null for a todo that does not exist', async () => {
    const user = await createTestUser()

    const { deleteTodo } = await user.api(DeleteTodoMutation, { input: { id: crypto.randomUUID() } })

    expect(deleteTodo).toBeNull()
  })

  it('cannot delete another user\'s todo', async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    const seeded = await seedTodo({ userId: owner.userId, title: 'not yours' })

    const { deleteTodo } = await other.api(DeleteTodoMutation, { input: { id: seeded.id } })
    expect(deleteTodo).toBeNull()

    const ownerView = await owner.api(TodoQuery, { id: seeded.id })
    expect(ownerView.todo?.id).toBe(seeded.id)
  })

  it('rejects without a session', async () => {
    const owner = await createTestUser()
    const seeded = await seedTodo({ userId: owner.userId, title: 'hidden' })

    await expectUnauthorizedError(requestGraphQL(DeleteTodoMutation, { input: { id: seeded.id } }))
  })
})
