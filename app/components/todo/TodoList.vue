<script setup lang="ts">
import type { AsyncDataRequestStatus } from '#app'
import { CloudOff, ListTodo, RefreshCw, Trash2 } from '@lucide/vue'
import { Button, Card, CardContent, Checkbox, Skeleton, Spinner } from '#components'

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
    <div
      v-if="status === 'pending' && items.length === 0"
      class="space-y-2"
      aria-busy="true"
    >
      <Card
        v-for="index in 4"
        :key="index"
        class="gap-0 py-0"
      >
        <CardContent class="flex items-center gap-3 px-4 py-3">
          <Skeleton class="size-5 shrink-0 rounded-md" />
          <Skeleton class="h-5 flex-1" />
          <Skeleton class="size-8 shrink-0 rounded-md" />
        </CardContent>
      </Card>
    </div>

    <Card
      v-else-if="status === 'error'"
      class="gap-0 py-0"
    >
      <CardContent class="px-6 py-12 text-center">
        <CloudOff class="mx-auto mb-4 size-9 text-muted-foreground" />
        <p class="font-medium">
          Could not load todos
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          Check that the API is running, then try again.
        </p>
        <Button
          variant="outline"
          class="mt-4"
          @click="emit('retry')"
        >
          <RefreshCw />
          Retry
        </Button>
      </CardContent>
    </Card>

    <Card
      v-else-if="items.length === 0"
      class="gap-0 py-0"
    >
      <CardContent class="px-6 py-12 text-center">
        <ListTodo class="mx-auto mb-4 size-9 text-muted-foreground" />
        <p class="font-medium">
          No todos yet
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          Add your first task above.
        </p>
      </CardContent>
    </Card>

    <ul
      v-else
      class="space-y-2 transition-opacity"
      :class="[status === 'pending' && 'pointer-events-none opacity-60']"
    >
      <li v-for="todo in items" :key="todo.id">
        <Card class="gap-0 py-0">
          <CardContent class="flex items-center gap-3 px-4 py-3">
            <Checkbox
              :model-value="todo.completed"
              :disabled="busyId === todo.id"
              :aria-label="todo.completed ? 'Mark incomplete' : 'Mark complete'"
              @update:model-value="emit('toggle', todo.id, Boolean($event))"
            />
            <span
              class="min-w-0 flex-1 text-sm"
              :class="todo.completed ? 'text-muted-foreground line-through' : ''"
            >
              {{ todo.title }}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete todo"
              :disabled="busyId === todo.id"
              @click="emit('remove', todo.id)"
            >
              <Spinner v-if="busyId === todo.id" />
              <Trash2 v-else />
            </Button>
          </CardContent>
        </Card>
      </li>
    </ul>
  </section>
</template>
