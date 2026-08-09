import { generate } from 'gazania/codegen'
import { isSchema, printSchema } from 'graphql'
import * as schemaModule from 'virtual:graphql-schema-entry'

declare const __GRAPHQL_SCHEMA_EXPORT__: string

const schema = schemaModule[__GRAPHQL_SCHEMA_EXPORT__]
if (!isSchema(schema)) {
  throw new Error(
    `Expected GraphQL schema export "${__GRAPHQL_SCHEMA_EXPORT__}"`,
  )
}

export const graphql = printSchema(schema)
export const gazania = generate({
  source: graphql,
  scalars: {},
  url: 'http://localhost',
})
