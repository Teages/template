import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

export function useDouble(num: MaybeRefOrGetter<number>) {
  return computed(() => toValue(num) * 2)
}
