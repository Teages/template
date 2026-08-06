import { fetch } from '~/test/env-runner-bridge.ts'
import { testOrigin } from '~/test/utils.ts'

if (!globalThis.setupInitialized) {
  globalThis.setupInitialized = true
  // Warm the env-runner document path (same route smoke asserts). Swallow only
  // so later tests still own the failure mode; do not use HEAD — it never hits SSR.
  // no-excuse-ok: catch
  // eslint-disable-next-line antfu/no-top-level-await
  await fetch('/', {
    headers: {
      Origin: testOrigin,
      Accept: 'text/html',
    },
  }).catch(() => null)
}

declare global {
  // eslint-disable-next-line vars-on-top
  var setupInitialized: boolean | undefined
}
