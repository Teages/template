import { describe, expect, it } from 'vitest'
import {
  getNodeTSConfig,
  getServerTSConfig,
  resolveGeneratedTSConfigDir,
  toRelative,
} from '~/plugins/tsconfig/index'

const paths = {
  rootDir: '/proj',
  tsconfigDir: '/proj/node_modules/.generated',
  buildDir: '/proj/node_modules/.nitro',
} as const

describe('toRelative', () => {
  it('prefixes a nested hidden path so tsc treats it as relative', () => {
    expect(toRelative('/proj', '/proj/node_modules/.generated/app.ts')).toBe('./node_modules/.generated/app.ts')
    expect(toRelative('/proj', '/proj/.env.d.ts')).toBe('./.env.d.ts')
  })

  it('leaves TypeScript-relative results unchanged', () => {
    expect(toRelative('/proj/node_modules/.generated', '/proj')).toBe('../..')
    expect(toRelative('/proj/node_modules/.generated', '/proj/node_modules/.generated')).toBe('.')
    expect(toRelative('/proj/node_modules/.generated', '/proj/app')).toBe('../../app')
  })

  it('prefixes a same-directory unprefixed path', () => {
    expect(toRelative('/proj/node_modules/.generated', '/proj/node_modules/.generated/app/**/*.ts')).toBe(
      './app/**/*.ts',
    )
  })

  it('keeps an unrelatable absolute path absolute', () => {
    expect(toRelative('C:/foo', 'D:/bar')).toBe('D:/bar')
  })
})

describe('generated tsconfig directory', () => {
  it('places generated tsconfigs under .generated when given a project root', () => {
    expect(resolveGeneratedTSConfigDir('/proj')).toBe('/proj/node_modules/.generated')
  })
})

describe('getServerTSConfig', () => {
  it('points Nitro generated types at buildDir when the tsconfig lives in .generated', () => {
    const config = getServerTSConfig(paths)

    expect(config.include).toEqual(expect.arrayContaining([
      '../.nitro/types/nitro-config.d.ts',
      '../.nitro/types/nitro-imports.d.ts',
      '../.nitro/types/nitro-routes.d.ts',
      '../../server/**/*.ts',
    ]))
    expect(config.include).not.toContain('./types/nitro-routes.d.ts')
  })
})

describe('getNodeTSConfig', () => {
  it('points Nitro config types at buildDir when the tsconfig lives in .generated', () => {
    const config = getNodeTSConfig(paths)

    expect(config.include).toContain(
      '../.nitro/types/nitro-config.d.ts',
    )
    expect(config.include).toEqual(expect.arrayContaining([
      '../../scripts/**/*.ts',
      '../../plugins/**/*.ts',
    ]))
    expect(config.include).not.toContain('./types/nitro-config.d.ts')
  })
})
