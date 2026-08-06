import type { AppContext } from '~/app/utils/app-context.ts'
import { inject } from 'vue'
import { APP_CONTEXT_KEY } from '~/app/utils/app-context.ts'

export function useAppContext(): AppContext {
  const ctx = inject(APP_CONTEXT_KEY, null)
  if (!ctx) {
    throw new Error(
      'App context is not available. Ensure entry-server / entry-client provide APP_CONTEXT_KEY.',
    )
  }
  return ctx
}
