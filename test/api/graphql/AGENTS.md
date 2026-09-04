# GraphQL Test Guide

Server-side tests for GraphQL behavior — resolvers, auth rules, pagination, and errors. Schema structure and conventions are defined in `server/graphql/schema/AGENTS.md`; every schema change needs matching coverage here. Test environment, auth, and seeding basics are documented in `test/api/AGENTS.md`.

## Structure

```text
test/api/graphql/
├── test-utils.ts
└── <domain>/
    ├── <Type>.test.ts
    ├── <Type>.<field>.test.ts
    └── operations/
        └── <operation>.test.ts
```

Files mirror `server/graphql/schema/<domain>/` one-to-one.

## Executing GraphQL

Use `requestGraphQL()` from `test/api/utils/graphql.ts` to execute GraphQL queries and mutations. It returns a promise that resolves to the parsed JSON response, including `data` and `errors`.

## What to test

- `operations/`: happy-path result shape, user scoping (a second user must never read or modify the first user's rows), rejection without a session, and pagination for connections — `pageInfo`, forward `first`/`after`, empty and final pages.
- `<Type>.test.ts` and `<Type>.<field>.test.ts`: exposed fields and relation fields, requested through real GraphQL selection sets so connection and relation loading stay honest.
- Assert errors the way clients do: select `__typename` and match inline fragments (`... on UnauthorizedError { message }`) instead of parsing error strings.
