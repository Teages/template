import { describe, expect, it } from 'vitest'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import { createSessionUser, expectUnauthorizedError, seedTodo } from '../../test-utils'

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
    const user = await createSessionUser('update-todo-title')
    const seeded = await seedTodo({ userId: user.userId, title: 'before' })

    const { updateTodo } = await requestGraphQL(
      UpdateTodoMutation,
      { input: { id: seeded.id, title: '  after  ' } },
      { cookie: user.cookie },
    )

    expect(updateTodo?.id).toBe(seeded.id)
    expect(updateTodo?.title).toBe('after')
    expect(updateTodo?.completed).toBe(false)
  })

  it('updates completed without touching the title', async () => {
    const user = await createSessionUser('update-todo-completed')
    const seeded = await seedTodo({ userId: user.userId, title: 'keep title' })

    const { updateTodo } = await requestGraphQL(
      UpdateTodoMutation,
      { input: { id: seeded.id, completed: true } },
      { cookie: user.cookie },
    )

    expect(updateTodo?.id).toBe(seeded.id)
    expect(updateTodo?.title).toBe('keep title')
    expect(updateTodo?.completed).toBe(true)
  })

  it('returns null when no field is given to update', async () => {
    const user = await createSessionUser('update-todo-noop')
    const seeded = await seedTodo({ userId: user.userId, title: 'unchanged' })

    const { updateTodo } = await requestGraphQL(
      UpdateTodoMutation,
      { input: { id: seeded.id } },
      { cookie: user.cookie },
    )

    expect(updateTodo).toBeNull()
  })

  it('returns null for a todo that does not exist', async () => {
    const user = await createSessionUser('update-todo-missing')

    const { updateTodo } = await requestGraphQL(
      UpdateTodoMutation,
      { input: { id: crypto.randomUUID(), title: 'ghost' } },
      { cookie: user.cookie },
    )

    expect(updateTodo).toBeNull()
  })

  it('cannot update another user\'s todo', async () => {
    const owner = await createSessionUser('update-todo-owner')
    const other = await createSessionUser('update-todo-other')
    const seeded = await seedTodo({ userId: owner.userId, title: 'original' })

    const { updateTodo } = await requestGraphQL(
      UpdateTodoMutation,
      { input: { id: seeded.id, title: 'hijacked' } },
      { cookie: other.cookie },
    )
    expect(updateTodo).toBeNull()

    const { todo } = await requestGraphQL(TodoQuery, { id: seeded.id }, { cookie: owner.cookie })
    expect(todo?.title).toBe('original')
  })

  it('rejects without a session', async () => {
    const owner = await createSessionUser('update-todo-unauth')
    const seeded = await seedTodo({ userId: owner.userId, title: 'hidden' })

    await expectUnauthorizedError(requestGraphQL(
      UpdateTodoMutation,
      { input: { id: seeded.id, title: 'anonymous' } },
    ))
  })
})
