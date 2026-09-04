import { describe, expect, it } from 'vitest'
import { createTestUser } from '../../utils/auth'
import { gazania } from '../../utils/graphql'
import { ISO_DATE_PATTERN, seedTodo } from '../test-utils'

const TodoAllFieldsQuery = gazania.query('TodoTypeFields')
  .vars({ id: 'ID!' })
  .select(($, vars) => $.select([{
    todo: $ => $.args({ id: vars.id }).select(['id', 'title', 'completed', 'createdAt', 'updatedAt']),
  }]))

describe('todo type', () => {
  it('exposes all declared fields through a selection set', async () => {
    const user = await createTestUser()
    const seeded = await seedTodo({
      userId: user.userId,
      title: 'field check',
      completed: true,
    })

    const { todo } = await user.api(TodoAllFieldsQuery, { id: seeded.id })

    expect(todo?.id).toBe(seeded.id)
    expect(todo?.title).toBe('field check')
    expect(todo?.completed).toBe(true)
    expect(todo?.createdAt).toEqual(expect.stringMatching(ISO_DATE_PATTERN))
    expect(todo?.updatedAt).toEqual(expect.stringMatching(ISO_DATE_PATTERN))
  })
})
