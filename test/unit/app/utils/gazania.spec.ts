import { describe, expect, it } from 'vitest'
import { gazania } from '~/utils/gazania'

// Placeholder for the `unit` project: node-only tests of app/shared code.
// Mirrors the layout of `app/`, e.g. `app/utils/gazania.ts` -> `test/unit/app/utils/gazania.spec.ts`.
describe('gazania', () => {
  it('exposes the document builders bound to the generated schema', () => {
    expect(gazania['~isGazania']).toBe(true)
    expect(typeof gazania.query).toBe('function')
    expect(typeof gazania.mutation).toBe('function')
  })
})
