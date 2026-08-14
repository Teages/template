import { describe, expect, it } from 'vitest'
import {
  getAppTSConfig,
  getNodeTSConfig,
  getServerTSConfig,
  resolveGeneratedTSConfigDir,
} from '~/plugins/tsconfig/index'

const paths = {
  rootDir: '/proj',
  tsconfigDir: '/proj/.generated',
  buildDir: '/proj/node_modules/.nitro',
} as const

describe('generated tsconfig directory', () => {
  it('places generated tsconfigs under .generated when given a project root', () => {
    expect(resolveGeneratedTSConfigDir('/proj')).toBe('/proj/.generated')
  })
})

describe('getAppTSConfig', () => {
  it('keeps project includes and aliases relative to .generated', () => {
    const config = getAppTSConfig(paths)

    expect(config.compilerOptions?.rootDir).toBe('..')
    expect(config.compilerOptions?.paths).toMatchObject({
      '~/*': ['../*'],
      '#generated/*': ['./*'],
    })
    expect(config.include).toEqual(expect.arrayContaining([
      '../env.d.ts',
      './app/**/*.ts',
      '../app/**/*.ts',
      '../app/**/*.vue',
    ]))
  })

  it('points Nitro route types at buildDir when the tsconfig lives in .generated', () => {
    const config = getAppTSConfig(paths)

    expect(config.include).toContain(
      '../node_modules/.nitro/types/nitro-routes.d.ts',
    )
    expect(config.include).not.toContain('./types/nitro-routes.d.ts')
  })
})

describe('getServerTSConfig', () => {
  it('points Nitro generated types at buildDir when the tsconfig lives in .generated', () => {
    const config = getServerTSConfig(paths)

    expect(config.include).toEqual(expect.arrayContaining([
      '../node_modules/.nitro/types/nitro-config.d.ts',
      '../node_modules/.nitro/types/nitro-imports.d.ts',
      '../node_modules/.nitro/types/nitro-routes.d.ts',
      '../server/**/*.ts',
    ]))
    expect(config.include).not.toContain('./types/nitro-routes.d.ts')
  })
})

describe('getNodeTSConfig', () => {
  it('points Nitro config types at buildDir when the tsconfig lives in .generated', () => {
    const config = getNodeTSConfig(paths)

    expect(config.include).toContain(
      '../node_modules/.nitro/types/nitro-config.d.ts',
    )
    expect(config.include).toEqual(expect.arrayContaining([
      '../scripts/**/*.ts',
      '../plugins/**/*.ts',
    ]))
    expect(config.include).not.toContain('./types/nitro-config.d.ts')
  })
})
