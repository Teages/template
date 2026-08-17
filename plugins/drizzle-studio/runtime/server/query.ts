import { isRecord } from '~/server/utils/predicates.ts'

export interface StudioPreparedQuery {
  readonly execute: () => Promise<unknown>
}

export interface StudioQuerySession {
  readonly prepareQuery: (
    query: { readonly sql: string, readonly params: unknown[] },
    mode: 'arrays' | 'objects' | 'raw',
    name: boolean,
  ) => StudioPreparedQuery
}

export interface StudioQueryClient {
  readonly _: {
    readonly session: StudioQuerySession
  }
}

export type StudioDatabase<TTx extends StudioQueryClient = StudioQueryClient> = StudioQueryClient & {
  readonly transaction: <T>(fn: (tx: TTx) => Promise<T>) => Promise<T>
}

export function prepareParams(params: readonly unknown[]): unknown[] {
  return params.map((param) => {
    if (!isRecord(param) || param.type !== 'binary')
      return param
    const value = param.value
    return typeof value === 'object' ? JSON.stringify(value) : value
  })
}

function rowMode(mode: 'array' | 'object' | undefined): 'arrays' | 'objects' {
  return mode === 'array' ? 'arrays' : 'objects'
}

export async function runStudioQuery(
  db: StudioQueryClient,
  data: { sql: string, params?: unknown[], mode?: 'array' | 'object' },
): Promise<unknown> {
  return await db._.session.prepareQuery(
    {
      sql: data.sql,
      params: prepareParams(data.params ?? []),
    },
    rowMode(data.mode),
    false,
  ).execute()
}

export async function runStudioTransaction<TTx extends StudioQueryClient>(
  db: StudioDatabase<TTx>,
  queries: readonly { sql: string }[],
): Promise<unknown[]> {
  const results: unknown[] = []
  try {
    await db.transaction(async (tx) => {
      for (const query of queries) {
        results.push(await runStudioQuery(tx, query))
      }
    })
  }
  catch (error) {
    if (error instanceof Error) {
      results.push(error)
      return results
    }
    results.push(new Error(String(error)))
  }
  return results
}
