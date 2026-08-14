<script setup lang="ts">
import { formatWhen } from '~/app/utils/format-when'

export interface CountEventFeedItem {
  readonly id: string | number
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

const props = withDefaults(defineProps<{
  /** Flattened list of count events to display, newest first. */
  events: readonly CountEventFeedItem[]
  /** Whether another page exists; controls the Load more footer. */
  hasMore: boolean
  /** Fetches the next page; the feed owns its own loading state. */
  loadMore: () => Promise<unknown>
  /** Time granularity, matching the page's `formatWhen` usage. */
  timeStyle?: 'short' | 'medium'
}>(), {
  timeStyle: 'short',
})

const loadingMore = shallowRef(false)

async function onLoadMore(): Promise<void> {
  if (!props.hasMore || loadingMore.value)
    return
  loadingMore.value = true
  try {
    await props.loadMore()
  }
  finally {
    loadingMore.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold text-highlighted">
        Event feed
      </h2>
    </template>

    <ul v-if="events.length > 0" class="divide-y divide-default">
      <li
        v-for="event in events"
        :key="event.id"
        class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="font-medium text-highlighted">
            {{ event.userName }}
          </p>
          <p class="text-sm text-muted">
            {{ event.userEmail }}
          </p>
        </div>
        <time class="text-sm text-muted" :datetime="event.createdAt">
          {{ formatWhen(event.createdAt, timeStyle) }}
        </time>
      </li>
    </ul>
    <p v-else class="text-sm text-muted">
      No counts yet. Be the first to click.
    </p>

    <template v-if="hasMore" #footer>
      <UButton
        label="Load more"
        color="neutral"
        variant="soft"
        :loading="loadingMore"
        @click="onLoadMore"
      />
    </template>
  </UCard>
</template>
