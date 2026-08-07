export const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const

export const COUNT_QUERY_KEYS = {
  graphql: ['count-events', 'graphql'] as const,
  rest: ['count-events', 'rest'] as const,
  trpc: ['count-events', 'trpc'] as const,
}
