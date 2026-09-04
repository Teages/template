import { describe, expect, it } from 'vitest'
import { gazania, requestGraphQL } from '../../utils/graphql'
import { createSessionUser, expectIsoDateString, seedTodo } from '../test-utils'

const TodoAllFieldsQuery = gazania.query('TodoTypeFields')
  .vars({ id: 'ID!' })
  .select(($, vars) => $.select([{
    todo: $ => $.args({ id: vars.id }).select(['id', 'title', 'completed', 'createdAt', 'updatedAt']),
  }]))

describe('todo type', () => {
  it('exposes all declared fields through a selection set', async () => {
    const user = await createSessionUser('todo-type')
    const seeded = await seedTodo({
      userId: user.userId,
      title: 'field check',
      completed: true,
    })

    const { todo } = await requestGraphQL(TodoAllFieldsQuery, { id: seeded.id }, { cookie: user.cookie })

    expect(todo?.id).toBe(seeded.id)
    expect(todo?.title).toBe('field check')
    expect(todo?.completed).toBe(true)
    expectIsoDateString(todo?.createdAt)
    expectIsoDateString(todo?.updatedAt)
  })
})
