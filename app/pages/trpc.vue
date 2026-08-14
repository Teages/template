<script setup lang="ts">
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~/server/trpc/root'
import { setInfiniteQueryData, useInfiniteQuery, useMutation, useQueryCache } from '@pinia/colada'
import { TRPCClientError } from '@trpc/client'
import { formatWhen } from '~/app/utils/format-when'
import { COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
import { createTRPCClient } from '~/app/utils/trpc-client'
import { useAppContext } from '~/plugins/vue-ssr/runtime/app/composables/useAppContext'

const trpc = createTRPCClient(useAppContext().$requestFetch)

useHead({ title: 'tRPC Demo' })

// --- tRPC.greet — public query demo -----------------------------------------

interface GreetResult {
  readonly greeting: string
  readonly at: string
}

const greetName = ref<string>('World')
const greetResult = ref<GreetResult | null>(null)
const greetError = ref<string | null>(null)
const greetLoading = ref(false)

async function runGreet(): Promise<void> {
  greetLoading.value = true
  greetError.value = null
  try {
    greetResult.value = await trpc.greet.greet.query({ name: greetName.value })
  }
  catch (cause: unknown) {
    greetError.value = cause instanceof Error ? cause.message : String(cause)
  }
  finally {
    greetLoading.value = false
  }
}

// --- tRPC.count — protected query + mutation demo ---------------------------

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
  isLoading: queryLoading,
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
        tRPC Demo
      </h1>
      <p class="mt-2 text-muted">
        End-to-end typesafe API at <code class="text-primary">/api/trpc</code> — same business logic as the GraphQL and REST surfaces.
      </p>
    </div>

    <!-- Greet: public query -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UBadge color="success" variant="subtle" label="query" />
          <h2 class="font-semibold text-highlighted">
            <code>greet.greet</code>
            <span class="ml-2 text-sm font-normal text-muted">— public, no auth</span>
          </h2>
        </div>
      </template>

      <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
        <UFormField label="Name" class="flex-1">
          <UInput
            v-model="greetName"
            placeholder="Enter a name"
            class="w-full"
            @keydown.enter="runGreet"
          />
        </UFormField>
        <UButton
          label="Greet"
          icon="i-lucide-hand"
          :loading="greetLoading"
          @click="runGreet"
        />
      </div>

      <div v-if="greetError" class="mt-4 text-sm text-error">
        {{ greetError }}
      </div>

      <div v-if="greetResult" class="mt-4 rounded-lg bg-elevated p-4">
        <p class="text-lg font-medium text-highlighted">
          {{ greetResult.greeting }}
        </p>
        <p class="mt-1 text-xs text-muted">
          Server time: {{ formatWhen(greetResult.at, 'medium') }}
        </p>
      </div>
    </UCard>

    <!-- Count: protected query + mutation -->
    <UCard>
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

      <p class="mb-4 text-2xl font-bold tabular-nums">
        Count: {{ data.total }}
      </p>

      <p v-if="countError" class="mb-4 text-sm text-error">
        {{ countError }}
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

      <ul v-if="data.items.length > 0" class="divide-y divide-default">
        <li
          v-for="event in data.items"
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
            {{ formatWhen(event.createdAt, 'medium') }}
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
