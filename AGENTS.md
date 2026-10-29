**IMPORTANT**: KEEP THIS FILE UP TO DATE

# AGENTS.md

## TEMPLATE NOTICE

Remove this section once you have set up your project.

It's a project template, update this file when you start to build. 

You will need to find a good [nuxt ui template](https://ui.nuxt.com/templates) when you need to build the user interface.


## Frameworks / Libraries
- Nuxt 5 (nightly) & Nitro 3
- GraphQL, check `shared/schema.graphql`
- Persisted operations: `modules/persisted-operations` extracts Gazania operations from `app/` into the Nitro virtual module `#graphql/persisted-operations`. Production Yoga executes only those documents.
- Better Auth

## Structure

```
app/
modules/
public/
server/
shared/
tests/
```

If a deeper AGENTS.md exists in a subdirectory, follow the deeper file for files in that subtree.

## Commands
- pnpm install
- pnpm dev
- pnpm test
- pnpm typecheck
- pnpm lint
- pnpm lint:fix
- pnpm db:generate

## Code style
- use strict TypeScript, avoid `any` and `as unknown as X`
- Single quotes, no semicolons
- Linting with ESLint, try `pnpm lint` to check for issues, then `pnpm lint:fix` to auto-fix

## Agents Guidelines
- Write clear, concise, and well-documented code
- Follow best practices for security and performance
- Ensure code is modular and reusable
- Checkout the document when using libraries or frameworks components
- Commit messages should be clear and descriptive
- Avoid committing generated files or dependencies
