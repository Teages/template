<script setup lang="ts">
import type { AsyncDataRequestStatus } from '#app'

export interface TodoListItem {
  id: string
  title: string
  completed: boolean
}

const {
  items,
  status,
  busyId,
} = defineProps<{
  items: readonly TodoListItem[]
  status: AsyncDataRequestStatus
  busyId: string | null
}>()

const emit = defineEmits<{
  retry: []
  toggle: [id: string, completed: boolean]
  remove: [id: string]
}>()
</script>

<template>
  <section class="space-y-4">
    <div v-if="status === 'pending' && items.length === 0" class="space-y-2">
      <UCard v-for="index in 4" :key="index">
        <div class="flex items-center gap-3">
          <USkeleton class="size-5 shrink-0 rounded-md" />
          <USkeleton class="h-5 flex-1" />
          <USkeleton class="size-8 shrink-0 rounded-md" />
        </div>
      </UCard>
    </div>

    <UCard v-else-if="status === 'error'" :ui="{ body: 'py-12 text-center' }">
      <UIcon name="i-lucide-cloud-off" class="mx-auto mb-4 text-4xl text-dimmed" />
      <p class="font-medium text-highlighted">
        Could not load todos
      </p>
      <p class="mt-1 text-sm text-muted">
        Check that the API is running, then try again.
      </p>
      <UButton
        class="mt-4"
        icon="i-lucide-refresh-cw"
        label="Retry"
        @click="emit('retry')"
      />
    </UCard>

    <UCard v-else-if="items.length === 0" :ui="{ body: 'py-12 text-center' }">
      <UIcon name="i-lucide-list-todo" class="mx-auto mb-4 text-4xl text-dimmed" />
      <p class="font-medium text-highlighted">
        No todos yet
      </p>
      <p class="mt-1 text-sm text-muted">
        Add your first task above.
      </p>
    </UCard>

    <ul
      v-else
      class="space-y-2 transition-opacity"
      :class="[status === 'pending' && 'pointer-events-none opacity-60']"
    >
      <li v-for="todo in items" :key="todo.id">
        <UCard :ui="{ body: 'py-3' }">
          <div class="flex items-center gap-3">
            <UCheckbox
              :model-value="todo.completed"
              :disabled="busyId === todo.id"
              :aria-label="todo.completed ? 'Mark incomplete' : 'Mark complete'"
              @update:model-value="emit('toggle', todo.id, Boolean($event))"
            />
            <span
              class="min-w-0 flex-1 text-sm"
              :class="todo.completed ? 'text-muted line-through' : 'text-highlighted'"
            >
              {{ todo.title }}
            </span>
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              aria-label="Delete todo"
              :loading="busyId === todo.id"
              @click="emit('remove', todo.id)"
            />
          </div>
        </UCard>
      </li>
    </ul>
  </section>
</template>
