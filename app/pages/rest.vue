<script setup lang="ts">
import type { RestCountEventPage } from '~/app/utils/rest-client'
import { FetchError } from 'ofetch'
import { createRestClient } from '~/app/utils/rest-client'

const rest = createRestClient(useAppContext().$requestFetch)

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function mapError(cause: unknown): string {
  if (cause instanceof FetchError && cause.statusCode === 401)
    return 'You must sign in to view the counter.'
  return cause instanceof Error ? cause.message : 'Unexpected error'
}

const { data, pending, error } = await useAsyncData(
  'rest-count-events',
  () => rest.listCountEvents(),
  {
    default: (): RestCountEventPage => ({
      data: [],
      meta: { total: 0, nextCursor: null },
    }),
  },
)

const errorMessage = computed(() => error.value ? mapError(error.value) : null)
const mutating = ref(false)
const loadingMore = ref(false)

async function recordCount(): Promise<void> {
  mutating.value = true
  try {
    const response = await rest.createCountEvent()
    const current = data.value
    data.value = {
      data: [response.data, ...current.data],
      meta: { ...current.meta, total: current.meta.total + 1 },
    }
    error.value = null
  }
  catch (cause: unknown) {
    error.value = cause instanceof Error ? cause : new Error(mapError(cause))
  }
  finally {
    mutating.value = false
  }
}

async function loadMore(): Promise<void> {
  const cursor = data.value.meta.nextCursor
  if (!cursor)
    return
  loadingMore.value = true
  try {
    const next = await rest.listCountEvents({ cursor })
    data.value = {
      data: [...data.value.data, ...next.data],
      meta: next.meta,
    }
  }
  catch (cause: unknown) {
    error.value = cause instanceof Error ? cause : new Error(mapError(cause))
  }
  finally {
    loadingMore.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-8 py-10">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-highlighted">
        REST Demo
      </h1>
      <p class="mt-2 text-muted">
        Resource-oriented API at <code class="text-primary">/api/count-events</code>.
      </p>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UBadge color="warning" variant="subtle" label="protected" />
          <h2 class="font-semibold text-highlighted">
            <code>GET /api/count-events</code>
            /
            <code>POST /api/count-events</code>
          </h2>
        </div>
      </template>

      <p class="mb-4 text-2xl font-bold tabular-nums">
        Count: {{ data.meta.total }}
      </p>
      <p v-if="errorMessage" class="mb-4 text-sm text-error">
        {{ errorMessage }}
      </p>
      <UButton
        label="Count"
        icon="i-lucide-plus"
        :loading="mutating || pending"
        @click="recordCount"
      />
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-highlighted">
          Event feed
        </h2>
      </template>

      <ul v-if="data.data.length > 0" class="divide-y divide-default">
        <li
          v-for="event in data.data"
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
            {{ formatWhen(event.createdAt) }}
          </time>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">
        No counts yet. Be the first to click.
      </p>

      <template v-if="data.meta.nextCursor" #footer>
        <UButton
          label="Load more"
          color="neutral"
          variant="soft"
          :loading="loadingMore"
          @click="loadMore"
        />
      </template>
    </UCard>
  </div>
</template>
