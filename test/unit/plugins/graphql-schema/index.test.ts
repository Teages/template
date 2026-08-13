import { describe, expect, it } from 'vitest'
import { graphqlSchemaPlugin } from '~/plugins/graphql-schema/index'

describe('graphql schema plugin wiring', () => {
  it('owns schema generation and source watching hooks', () => {
    const plugin = graphqlSchemaPlugin({
      schema: 'server/graphql/schema.ts',
      schemaExport: 'schema',
      outputs: {
        graphql: 'schema.graphql',
        gazania: '.generated/shared/gazania.d.ts',
      },
    })

    expect(plugin.name).toBe('graphql-schema')
    expect(plugin.apply).toBe('serve')
    expect(typeof plugin.configResolved).toBe('function')
    expect(typeof plugin.buildStart).toBe('function')
    expect(typeof plugin.configureServer).toBe('function')
  })
})
