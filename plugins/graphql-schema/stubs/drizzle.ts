/**
 * Stand-in for the generated `#drizzle` virtual client inside the GraphQL
 * schema runner. The runner executes outside the Nitro pipeline, so `#drizzle`
 * cannot resolve there; codegen only loads modules and never calls the
 * database, so a throwing stub keeps the graph loadable.
 */
export function useDrizzle(): never {
  throw new Error('The database is not available in the GraphQL schema runner.')
}
