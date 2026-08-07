<script setup lang="ts">
import type { RestCountEventPage } from '~/app/utils/rest-client'
import { setInfiniteQueryData, useInfiniteQuery, useMutation, useQueryCache } from '@pinia/colada'
import { FetchError } from 'ofetch'
import { COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
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

const queryCache = useQueryCache()
const {
  data: queryData,
  error: queryError,
  hasNextPage,
  isLoading: queryLoading,
  loadNextPage,
} = useInfiniteQuery<RestCountEventPage, Error, string | null>({
  key: COUNT_QUERY_KEYS.rest,
  initialPageParam: null,
  query: ({ pageParam }) => rest.listCountEvents({
    cursor: pageParam ?? undefined,
  }),
  getNextPageParam: lastPage => lastPage.meta.nextCursor,
})

const data = computed<RestCountEventPage>(() => {
  const pages = queryData.value?.pages ?? []
  const firstPage = pages[0]
  const lastPage = pages.at(-1)
  return {
    data: pages.flatMap(page => page.data),
    meta: {
      total: firstPage?.meta.total ?? 0,
      nextCursor: lastPage?.meta.nextCursor ?? null,
    },
  }
})

const {
  error: mutationError,
  isLoading: mutating,
  mutate: recordCount,
} = useMutation({
  mutation: () => rest.createCountEvent(),
  onSuccess(response) {
    setInfiniteQueryData<RestCountEventPage, Error, string | null>(
      queryCache,
      COUNT_QUERY_KEYS.rest,
      (current) => {
        if (!current?.pages.length) {
          return {
            pages: [{
              data: [response.data],
              meta: { total: 1, nextCursor: null },
            }],
            pageParams: [null],
          }
        }
        return {
          ...current,
          pages: current.pages.map((page, index) => ({
            ...page,
            data: index === 0
              ? [response.data, ...page.data]
              : page.data,
            meta: { ...page.meta, total: page.meta.total + 1 },
          })),
        }
      },
    )
  },
})

const errorMessage = computed(() => {
  const error = mutationError.value ?? queryError.value
  return error ? mapError(error) : null
})
const loadingMore = shallowRef(false)

async function loadMore(): Promise<void> {
  if (!hasNextPage.value)
    return
  loadingMore.value = true
  try {
    await loadNextPage()
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
        :loading="mutating || queryLoading"
        @click="recordCount()"
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

      <template v-if="hasNextPage" #footer>
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
