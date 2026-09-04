import { describe, expect, it } from 'vitest'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import {
  createSessionUser,
  expectIsoDateString,
  expectUnauthorizedError,
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
    const user = await createSessionUser('create-todo')

    const { createTodo } = await requestGraphQL(
      CreateTodoMutation,
      { input: { title: '  Buy milk  ' } },
      { cookie: user.cookie },
    )

    expect(createTodo?.id).toEqual(expect.stringMatching(UUID_PATTERN))
    expect(createTodo?.title).toBe('Buy milk')
    expect(createTodo?.completed).toBe(false)
    expectIsoDateString(createTodo?.createdAt)
    expectIsoDateString(createTodo?.updatedAt)
  })

  it('scopes the created todo to the session user', async () => {
    const owner = await createSessionUser('create-todo-owner')
    const other = await createSessionUser('create-todo-other')

    const { createTodo } = await requestGraphQL(
      CreateTodoMutation,
      { input: { title: 'owner only' } },
      { cookie: owner.cookie },
    )
    expect(createTodo?.id).toBeDefined()

    const ownerView = await requestGraphQL(TodosIdsQuery, {}, { cookie: owner.cookie })
    const ownerIds = ownerView.todos?.edges?.flatMap(edge => edge?.node?.id ?? []) ?? []
    expect(ownerIds).toContain(createTodo?.id)

    const otherView = await requestGraphQL(TodosIdsQuery, {}, { cookie: other.cookie })
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
