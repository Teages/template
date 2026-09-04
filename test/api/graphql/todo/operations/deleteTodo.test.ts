import { describe, expect, it } from 'vitest'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import { createSessionUser, expectUnauthorizedError, seedTodo } from '../../test-utils'

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
    const user = await createSessionUser('delete-todo')
    const kept = await seedTodo({ userId: user.userId, title: 'kept' })
    const removed = await seedTodo({ userId: user.userId, title: 'removed' })

    const { deleteTodo } = await requestGraphQL(
      DeleteTodoMutation,
      { input: { id: removed.id } },
      { cookie: user.cookie },
    )

    expect(deleteTodo?.success).toBe(true)
    expect(deleteTodo?.id).toBe(removed.id)

    const { todo } = await requestGraphQL(TodoQuery, { id: removed.id }, { cookie: user.cookie })
    expect(todo).toBeNull()

    const keptView = await requestGraphQL(TodoQuery, { id: kept.id }, { cookie: user.cookie })
    expect(keptView.todo?.id).toBe(kept.id)
  })

  it('returns null for a todo that does not exist', async () => {
    const user = await createSessionUser('delete-todo-missing')

    const { deleteTodo } = await requestGraphQL(
      DeleteTodoMutation,
      { input: { id: crypto.randomUUID() } },
      { cookie: user.cookie },
    )

    expect(deleteTodo).toBeNull()
  })

  it('cannot delete another user\'s todo', async () => {
    const owner = await createSessionUser('delete-todo-owner')
    const other = await createSessionUser('delete-todo-other')
    const seeded = await seedTodo({ userId: owner.userId, title: 'not yours' })

    const { deleteTodo } = await requestGraphQL(
      DeleteTodoMutation,
      { input: { id: seeded.id } },
      { cookie: other.cookie },
    )
    expect(deleteTodo).toBeNull()

    const ownerView = await requestGraphQL(TodoQuery, { id: seeded.id }, { cookie: owner.cookie })
    expect(ownerView.todo?.id).toBe(seeded.id)
  })

  it('rejects without a session', async () => {
    const owner = await createSessionUser('delete-todo-unauth')
    const seeded = await seedTodo({ userId: owner.userId, title: 'hidden' })

    await expectUnauthorizedError(requestGraphQL(DeleteTodoMutation, { input: { id: seeded.id } }))
  })
})
