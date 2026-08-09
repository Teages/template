import { beforeAll } from 'vitest'
import { fetch } from '~/test/env-runner-bridge.ts'
import { testOrigin } from '~/test/utils.ts'

interface TestSetupGlobal {
  ssrWarmup?: Promise<void>
}

const testSetupGlobal = globalThis as unknown as TestSetupGlobal

async function warmSsr(): Promise<void> {
  // Compile the SSR graph before the first document test starts its timeout.
  await fetch('/', {
    headers: {
      Origin: testOrigin,
      Accept: 'text/html',
    },
  })
}

beforeAll(async () => {
  testSetupGlobal.ssrWarmup ??= warmSsr()
  await testSetupGlobal.ssrWarmup
})
