import { describe, expect, it } from 'vitest'
import {
  prepareParams,
  runStudioQuery,
} from '~/plugins/drizzle-studio/runtime/server/query'

interface PreparedCall {
  readonly sql: string
  readonly params: unknown[]
  readonly mode: 'arrays' | 'objects' | 'raw'
}

function studioClient(result: unknown = [{ n: 1 }]) {
  const calls: PreparedCall[] = []
  return {
    calls,
    db: {
      _: {
        session: {
          prepareQuery(
            query: { sql: string, params: unknown[] },
            mode: 'arrays' | 'objects' | 'raw',
          ) {
            calls.push({ sql: query.sql, params: query.params, mode })
            return {
              execute: () => Promise.resolve(result),
            }
          },
        },
      },
    },
  }
}

describe('prepareParams', () => {
  it('stringifies binary object values and leaves other params unchanged', () => {
    expect(prepareParams([
      1,
      { type: 'binary', value: { foo: 1 } },
      { type: 'binary', value: 'plain' },
    ])).toEqual([
      1,
      '{"foo":1}',
      'plain',
    ])
  })
})

describe('runStudioQuery', () => {
  it('forwards the original SQL and params to session.prepareQuery', async () => {
    const { db, calls } = studioClient([{ sum: 5 }])

    const rows = await runStudioQuery(db, {
      sql: 'SELECT \'$1\' AS literal, $1::int AS sum',
      params: [5],
    })

    expect(calls).toEqual([{
      sql: 'SELECT \'$1\' AS literal, $1::int AS sum',
      params: [5],
      mode: 'objects',
    }])
    expect(rows).toEqual([{ sum: 5 }])
  })

  it('uses array row mode when Studio asks for arrays', async () => {
    const { db, calls } = studioClient([['alpha']])

    const rows = await runStudioQuery(db, {
      sql: 'SELECT name FROM studio_items',
      mode: 'array',
    })

    expect(calls[0]?.mode).toBe('arrays')
    expect(rows).toEqual([['alpha']])
  })
})
