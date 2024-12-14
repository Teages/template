import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'

export function useDouble(num: MaybeRefOrGetter<number>, options?: UseDoubleOptions) {
  const { add = 0 } = options || {}

  return computed(() => toValue(num) * 2 + toValue(add))
}

export interface UseDoubleOptions {
  add?: MaybeRefOrGetter<number>
}
