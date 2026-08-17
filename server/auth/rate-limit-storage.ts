import type { AuthRateLimitStorage } from '~/server/auth/rate-limit'
import { useStorage } from 'nitro/storage'
import { AUTH_RATE_LIMIT_MOUNT } from '~/server/auth/rate-limit'

export function useAuthRateLimitStorage(): AuthRateLimitStorage {
  const storage = useStorage(AUTH_RATE_LIMIT_MOUNT)
  return {
    getItem: key => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, [...value]),
    removeItem: key => storage.removeItem(key),
    getKeys: () => storage.getKeys(),
    clear: () => storage.clear(),
  }
}
