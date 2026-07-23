interface ImportMeta {
  MOCK_DATABASE?: boolean | 'seed' | undefined
  hot?: { data: Record<string, unknown> } | undefined
  glob(pattern: string, options?: { eager?: boolean, query?: string, import?: string }): Record<string, () => Promise<unknown>> | Record<string, unknown>
  vitest?: typeof import('vitest')
}
