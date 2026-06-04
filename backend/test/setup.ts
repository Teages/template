/**
 * Preheat the server by sending a HEAD request.
 * This makes sure that the database can be mocked before the tests call it.
 */
import { serverFetch } from 'nitro/app'

// @ts-expect-error setupInitialized is not typed
if (!globalThis.setupInitialized) {
  // @ts-expect-error setupInitialized is not typed
  globalThis.setupInitialized = true

  // eslint-disable-next-line antfu/no-top-level-await
  await serverFetch('/', { method: 'HEAD' }).catch(() => null)
}
