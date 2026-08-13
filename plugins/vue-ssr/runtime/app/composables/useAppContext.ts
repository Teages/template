import type { AppContext } from '../app-context.ts'
import { inject } from 'vue'
import { APP_CONTEXT_KEY } from '../app-context.ts'

export function useAppContext(): AppContext {
  const context = inject(APP_CONTEXT_KEY, null)
  if (!context) {
    throw new Error(
      'App context is not available. Ensure the Vue SSR bootstrap provides APP_CONTEXT_KEY.',
    )
  }
  return context
}
