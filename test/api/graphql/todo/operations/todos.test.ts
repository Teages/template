import type { ResultOf } from 'gazania'
import { describe, expect, it } from 'vitest'
import { gazania, requestGraphQL } from '../../../utils/graphql'
import { createSessionUser, expectUnauthorizedError, seedTodo } from '../../test-utils'

const TodosPageQuery = gazania.query('TodosConnectionTest')
  .vars({ first: 'Int', after: 'String' })
  .select(($, vars) => $.select([{
    todos: $ => $.args({ first: vars.first, after: vars.after }).select([{
      edges: $ => $.select(['cursor', {
        node: $ => $.select(['id', 'title']),
      }]),
      pageInfo: $ => $.select(['startCursor', 'endCursor', 'hasNextPage', 'hasPreviousPage']),
    }]),
  }]))

function seededTitles(connection: ResultOf<typeof TodosPageQuery>): string[] {
  return connection.todos?.edges?.flatMap(edge => edge?.node?.title ?? []) ?? []
}

describe('todos query', () => {
  it('lists only the session user\'s todos, newest first', async () => {
    const owner = await createSessionUser('todos-owner')
    const other = await createSessionUser('todos-other')
    const base = new Date('2026-01-01T00:00:00.000Z')
    await seedTodo({ userId: owner.userId, title: 'todo-a', createdAt: base })
    await seedTodo({ userId: owner.userId, title: 'todo-b', createdAt: new Date(base.getTime() + 60_000) })
    await seedTodo({ userId: owner.userId, title: 'todo-c', createdAt: new Date(base.getTime() + 120_000) })
    await seedTodo({ userId: other.userId, title: 'someone else', createdAt: new Date(base.getTime() + 180_000) })

    const connection = await requestGraphQL(TodosPageQuery, { first: 10 }, { cookie: owner.cookie })

    expect(seededTitles(connection)).toEqual(['todo-c', 'todo-b', 'todo-a'])
    for (const edge of connection.todos?.edges ?? []) {
      expect(edge?.cursor).toEqual(expect.any(String))
    }
  })

  it('walks forward pages with first and after', async () => {
    const user = await createSessionUser('todos-pagination')
    const base = new Date('2026-02-01T00:00:00.000Z')
    for (let index = 0; index < 5; index++) {
      await seedTodo({
        userId: user.userId,
        title: `todo-${index}`,
        createdAt: new Date(base.getTime() + index * 60_000),
      })
    }

    const firstPage = await requestGraphQL(TodosPageQuery, { first: 2 }, { cookie: user.cookie })
    expect(seededTitles(firstPage)).toEqual(['todo-4', 'todo-3'])
    expect(firstPage.todos?.pageInfo.hasNextPage).toBe(true)
    expect(firstPage.todos?.pageInfo.hasPreviousPage).toBe(false)
    expect(firstPage.todos?.pageInfo.startCursor).toBe(firstPage.todos?.edges?.[0]?.cursor)
    expect(firstPage.todos?.pageInfo.endCursor).toBe(firstPage.todos?.edges?.[1]?.cursor)

    const secondPage = await requestGraphQL(
      TodosPageQuery,
      { first: 2, after: firstPage.todos?.pageInfo.endCursor ?? '' },
      { cookie: user.cookie },
    )
    expect(seededTitles(secondPage)).toEqual(['todo-2', 'todo-1'])
    expect(secondPage.todos?.pageInfo.hasNextPage).toBe(true)

    const finalPage = await requestGraphQL(
      TodosPageQuery,
      { first: 2, after: secondPage.todos?.pageInfo.endCursor ?? '' },
      { cookie: user.cookie },
    )
    expect(seededTitles(finalPage)).toEqual(['todo-0'])
    expect(finalPage.todos?.pageInfo.hasNextPage).toBe(false)
    expect(finalPage.todos?.pageInfo.endCursor).toBe(finalPage.todos?.edges?.[0]?.cursor)
  })

  it('returns an empty connection for a user without todos', async () => {
    const user = await createSessionUser('todos-empty')

    const connection = await requestGraphQL(TodosPageQuery, { first: 2 }, { cookie: user.cookie })

    expect(connection.todos?.edges).toEqual([])
    expect(connection.todos?.pageInfo.hasNextPage).toBe(false)
    expect(connection.todos?.pageInfo.hasPreviousPage).toBe(false)
    expect(connection.todos?.pageInfo.startCursor).toBeNull()
    expect(connection.todos?.pageInfo.endCursor).toBeNull()
  })

  it('rejects without a session', async () => {
    await expectUnauthorizedError(requestGraphQL(TodosPageQuery, { first: 2 }))
  })
})
