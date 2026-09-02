import type { TestProjectConfiguration } from 'vitest/config'

export function unit(rootDir: string): TestProjectConfiguration {
  return {
    resolve: {
      alias: {
        '~': `${rootDir}/app`,
        '~~': rootDir,
        '#shared': `${rootDir}/shared`,
      },
    },
    test: {
      name: 'unit',
      include: ['test/unit/**/*.{test,spec}.ts'],
      environment: 'node',
    },
  }
}
