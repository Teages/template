import { serverFetch } from 'nitro/app'

// warm up the server and mock db
try {
  // eslint-disable-next-line antfu/no-top-level-await
  await serverFetch('/api/health', { method: 'HEAD' })
}
finally {
  // ignore
}
