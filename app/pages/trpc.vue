<script setup lang="ts">
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~/server/trpc/root'
import { setInfiniteQueryData, useInfiniteQuery, useMutation, useQueryCache } from '@pinia/colada'
import { TRPCClientError } from '@trpc/client'
import { COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
import { createTRPCClient } from '~/app/utils/trpc-client'

const trpc = createTRPCClient(useAppContext().$requestFetch)

useHead({ title: 'tRPC Demo' })

type RouterOutputs = inferRouterOutputs<AppRouter>
type CountPage = RouterOutputs['count']['list']

function mapError(cause: unknown): string {
  if (cause instanceof TRPCClientError && cause.data?.code === 'UNAUTHORIZED') {
    return 'You must sign in to view the counter.'
  }
  if (cause instanceof Error) {
    return cause.message
  }
  return 'Unexpected error'
}

const queryCache = useQueryCache()
const {
  data: queryData,
  error: queryError,
  hasNextPage,
  loadNextPage,
} = useInfiniteQuery<CountPage, Error, string | null>({
  key: COUNT_QUERY_KEYS.trpc,
  initialPageParam: null,
  query: ({ pageParam }) => pageParam
    ? trpc.count.list.query({ cursor: pageParam })
    : trpc.count.list.query(),
  getNextPageParam: lastPage => lastPage.nextCursor,
})

const data = computed<CountPage>(() => {
  const pages = queryData.value?.pages ?? []
  return {
    total: pages[0]?.total ?? 0,
    items: pages.flatMap(page => page.items),
    nextCursor: pages.at(-1)?.nextCursor ?? null,
  }
})

const {
  error: mutationError,
  isLoading: mutating,
  mutate: recordCount,
} = useMutation({
  mutation: () => trpc.count.create.mutate(),
  onSuccess(created) {
    setInfiniteQueryData<CountPage, Error, string | null>(
      queryCache,
      COUNT_QUERY_KEYS.trpc,
      (current) => {
        if (!current?.pages.length) {
          return {
            pages: [{
              total: created.total,
              items: [created.item],
              nextCursor: null,
            }],
            pageParams: [null],
          }
        }
        return {
          ...current,
          pages: current.pages.map((page, index) => ({
            ...page,
            total: created.total,
            items: index === 0
              ? [created.item, ...page.items]
              : page.items,
          })),
        }
      },
    )
  },
})

const countError = computed(() => {
  const error = mutationError.value ?? queryError.value
  return error ? mapError(error) : null
})
</script>

<template>
  <div class="flex flex-col gap-8 py-10">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-highlighted">
        tRPC Demo
      </h1>
      <p class="mt-2 text-muted">
        End-to-end typesafe API at <code class="text-primary">/api/trpc</code> — same business logic as the GraphQL and REST surfaces.
      </p>
    </div>

    <CountControls
      :count="data.total"
      :error-message="countError"
      :loading="mutating"
      @increment="recordCount()"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UBadge color="warning" variant="subtle" label="protected" />
          <h2 class="font-semibold text-highlighted">
            <code>count.list</code>
            /
            <code>count.create</code>
          </h2>
        </div>
      </template>
    </CountControls>

    <CountEventFeed
      :events="data.items"
      :has-more="hasNextPage"
      :load-more="loadNextPage"
      time-style="medium"
    />
  </div>
</template>
