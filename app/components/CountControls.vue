<script setup lang="ts">
defineProps<{
  count: number
  errorMessage: string | null
  /** Loading state of the increment action itself, not of the query. */
  loading: boolean
}>()

defineEmits<{
  increment: []
}>()
</script>

<template>
  <UCard>
    <template #header>
      <slot name="header">
        <h2 class="font-semibold text-highlighted">
          Counter
        </h2>
      </slot>
    </template>

    <p class="mb-4 text-2xl font-bold tabular-nums">
      Count: {{ count }}
    </p>

    <p v-if="errorMessage" class="mb-4 text-sm text-error">
      {{ errorMessage }}
    </p>

    <UButton
      label="Count"
      icon="i-lucide-plus"
      :loading="loading"
      @click="$emit('increment')"
    />
  </UCard>
</template>
