<script setup lang="ts">
import type { RestCountEventPage } from '~/app/utils/rest-client'
import { setInfiniteQueryData, useInfiniteQuery, useMutation, useQueryCache } from '@pinia/colada'
import { FetchError } from 'ofetch'
import { COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
import { createRestClient } from '~/app/utils/rest-client'

const rest = createRestClient(useAppContext().$requestFetch)

useHead({ title: 'REST Demo' })

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

    <CountControls
      :count="data.meta.total"
      :error-message="errorMessage"
      :loading="mutating"
      @increment="recordCount()"
    >
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
    </CountControls>

    <CountEventFeed
      :events="data.data"
      :has-more="hasNextPage"
      :load-more="loadNextPage"
    />
  </div>
</template>
