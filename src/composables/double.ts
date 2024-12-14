import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { sum } from '../utils/sum'

export function useDouble(num: MaybeRefOrGetter<number>, options?: UseDoubleOptions) {
  const { add = 0 } = options || {}

  return computed(() => sum(toValue(num) * 2, toValue(add)))
}

export interface UseDoubleOptions {
  add?: MaybeRefOrGetter<number>
}
