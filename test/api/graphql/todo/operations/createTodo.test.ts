import { describe, expect, it } from 'vitest'
import { createTestUser } from '../../../utils/auth'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import {
  expectUnauthorizedError,
  ISO_DATE_PATTERN,
  UUID_PATTERN,
} from '../../test-utils'

const CreateTodoMutation = gazania.mutation('CreateTodoTest')
  .vars({ input: 'CreateTodoInput!' })
  .select(($, vars) => $.select([{
    createTodo: $ => $.args({ input: vars.input }).select(['id', 'title', 'completed', 'createdAt', 'updatedAt']),
  }]))

const TodosIdsQuery = gazania.query('CreateTodoScopeProbe')
  .select($ => $.select([{
    todos: $ => $.args({ first: 20 }).select([{
      edges: $ => $.select([{
        node: $ => $.select(['id']),
      }]),
    }]),
  }]))

describe('createTodo mutation', () => {
  it('creates a todo for the session user and returns its fields', async () => {
    const user = await createTestUser()

    const { createTodo } = await user.api(
      CreateTodoMutation,
      { input: { title: '  Buy milk  ' } },
    )

    expect(createTodo?.id).toEqual(expect.stringMatching(UUID_PATTERN))
    expect(createTodo?.title).toBe('Buy milk')
    expect(createTodo?.completed).toBe(false)
    expect(createTodo?.createdAt).toEqual(expect.stringMatching(ISO_DATE_PATTERN))
    expect(createTodo?.updatedAt).toEqual(expect.stringMatching(ISO_DATE_PATTERN))
  })

  it('scopes the created todo to the session user', async () => {
    const owner = await createTestUser()
    const other = await createTestUser()

    const { createTodo } = await owner.api(
      CreateTodoMutation,
      { input: { title: 'owner only' } },
    )
    expect(createTodo?.id).toBeDefined()

    const ownerView = await owner.api(TodosIdsQuery, {})
    const ownerIds = ownerView.todos?.edges?.flatMap(edge => edge?.node?.id ?? []) ?? []
    expect(ownerIds).toContain(createTodo?.id)

    const otherView = await other.api(TodosIdsQuery, {})
    const otherIds = otherView.todos?.edges?.flatMap(edge => edge?.node?.id ?? []) ?? []
    expect(otherIds).not.toContain(createTodo?.id)
  })

  it('rejects creation without a session', async () => {
    await expectUnauthorizedError(requestGraphQL(
      CreateTodoMutation,
      { input: { title: 'anonymous' } },
    ))
  })
})
