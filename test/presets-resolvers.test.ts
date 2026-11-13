import { describe, expect, it } from 'vitest'
import { packagePreset, unimportPreset } from '../src/presets'
import { componentResolver } from '../src/resolvers'

describe('presets', () => {
  it('unimportPreset', () => {
    expect(unimportPreset.from).toBe('package-name')
    expect(unimportPreset.imports).toEqual(
      expect.arrayContaining(['sum', 'useDouble']),
    )
  })

  it('packagePreset', () => {
    expect(packagePreset.package).toBe('package-name')
    expect(packagePreset.ignore).toContain('Button')
  })
})

describe('resolvers', () => {
  it('resolves prefixed component', () => {
    const resolver = componentResolver()

    expect(resolver('PButton')).toEqual({
      name: 'Button',
      from: 'package-name',
      sideEffects: 'package-name/styles',
    })
  })

  it('ignores unknown component', () => {
    const resolver = componentResolver()

    expect(resolver('PUnknown')).toBeUndefined()
    expect(resolver('Button')).toBeUndefined()
  })

  it('supports custom prefix', () => {
    const resolver = componentResolver({ prefix: 'T' })

    expect(resolver('TButton')).toEqual({
      name: 'Button',
      from: 'package-name',
      sideEffects: 'package-name/styles',
    })
  })

  it('can disable style import', () => {
    const resolver = componentResolver({ importStyle: false })

    expect(resolver('PButton')).toEqual({
      name: 'Button',
      from: 'package-name',
    })
  })
})
