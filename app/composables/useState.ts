import type { Ref } from 'vue'
import { toRef } from 'vue'
import { useAppContext } from './useAppContext'

export function useState<T>(key: string, init?: () => T): Ref<T> {
  const ctx = useAppContext()
  const cached = ctx._stateRefs.get(key)
  if (cached) {
    return cached as Ref<T>
  }

  if (!(key in ctx.payload.state)) {
    ctx.payload.state[key] = init ? init() : undefined
  }

  const stateRef = toRef(ctx.payload.state, key) as Ref<T>
  ctx._stateRefs.set(key, stateRef as Ref<unknown>)
  return stateRef
}
