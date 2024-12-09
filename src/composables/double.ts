import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'

export function useDouble(num: MaybeRefOrGetter<number>) {
  return computed(() => toValue(num) * 2)
}
