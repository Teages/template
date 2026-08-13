<script setup lang="ts">
import { setInfiniteQueryData, useInfiniteQuery, useMutation, useQueryCache } from '@pinia/colada'
import { COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
import { createGraphQLClient, GraphQLRequestError } from '~/plugins/graphql-schema/runtime/app/client'
import { gazania } from '~/plugins/graphql-schema/runtime/shared/gazania'
import { useAppContext } from '~/plugins/vue-ssr/runtime/app/composables/useAppContext'

const graphql = createGraphQLClient(useAppContext().$requestFetch)

interface CountEvent {
  readonly id: string
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

interface CountSnapshot {
  readonly count: number
  readonly events: readonly CountEvent[]
  readonly pageInfo: {
    readonly endCursor: string | null
    readonly hasNextPage: boolean
  }
}

const PAGE_SIZE = 20

const CountSnapshotQuery = gazania.query('CountSnapshot')
  .vars({ first: 'Int!', after: 'String' })
  .select(($, vars) => $.select([
    'count',
    {
      countEvents: $ => $.args({ first: vars.first, after: vars.after }).select([{
        edges: $ => $.select([{
          node: $ => $.select([
            'id',
            'createdAt',
            { user: $ => $.select(['name', 'email']) },
          ]),
        }]),
        pageInfo: $ => $.select(['endCursor', 'hasNextPage']),
      }]),
    },
  ]))

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatCreatedAt(value: unknown): string {
  if (typeof value === 'string')
    return value
  if (value instanceof Date)
    return value.toISOString()
  if (typeof value === 'number')
    return new Date(value).toISOString()
  throw new Error('Invalid createdAt value')
}

function mapEvent(node: {
  id: string | number
  createdAt: unknown
  user: { name: string, email: string }
}): CountEvent {
  return {
    id: String(node.id),
    userName: node.user.name,
    userEmail: node.user.email,
    createdAt: formatCreatedAt(node.createdAt),
  }
}

function mapSnapshot(data: Awaited<ReturnType<typeof fetchSnapshot>>): CountSnapshot {
  const mapped: CountEvent[] = []
  for (const edge of data.countEvents.edges) {
    mapped.push(mapEvent(edge.node))
  }
  return {
    count: data.count,
    events: mapped,
    pageInfo: {
      endCursor: data.countEvents.pageInfo.endCursor ?? null,
      hasNextPage: data.countEvents.pageInfo.hasNextPage,
    },
  }
}

async function fetchSnapshot(after?: string) {
  return graphql.request(CountSnapshotQuery, {
    first: PAGE_SIZE,
    after,
  })
}

function toUserMessage(e: unknown): string {
  if (e instanceof GraphQLRequestError) {
    const message = e.errors.map(err => err.message).join('\n')
    if (/unauthorized/i.test(message))
      return 'You must sign in to view the counter'
    return message
  }
  if (e instanceof Error) {
    if (/unauthorized/i.test(e.message))
      return 'You must sign in to view the counter'
    return e.message
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
} = useInfiniteQuery<CountSnapshot, Error, string | null>({
  key: COUNT_QUERY_KEYS.graphql,
  initialPageParam: null,
  query: async ({ pageParam }) => mapSnapshot(
    await fetchSnapshot(pageParam ?? undefined),
  ),
  getNextPageParam: lastPage => lastPage.pageInfo.endCursor,
})

const data = computed<CountSnapshot>(() => {
  const pages = queryData.value?.pages ?? []
  const firstPage = pages[0]
  const lastPage = pages.at(-1)
  return {
    count: firstPage?.count ?? 0,
    events: pages.flatMap(page => page.events),
    pageInfo: lastPage?.pageInfo ?? {
      endCursor: null,
      hasNextPage: false,
    },
  }
})

const {
  error: mutationError,
  isLoading: mutating,
  mutate: increment,
} = useMutation({
  mutation: async () => {
    const result = await graphql.request(
      gazania.mutation('RecordCount')
        .select($ => $.select([{
          recordCount: $ => $.select([
            'totalCount',
            {
              countEvent: $ => $.select([
                'id',
                'createdAt',
                { user: $ => $.select(['name', 'email']) },
              ]),
            },
          ]),
        }])),
    )
    return {
      event: mapEvent(result.recordCount.countEvent),
      total: result.recordCount.totalCount,
    }
  },
  onSuccess(result) {
    setInfiniteQueryData<CountSnapshot, Error, string | null>(
      queryCache,
      COUNT_QUERY_KEYS.graphql,
      (current) => {
        if (!current?.pages.length) {
          return {
            pages: [{
              count: result.total,
              events: [result.event],
              pageInfo: { endCursor: null, hasNextPage: false },
            }],
            pageParams: [null],
          }
        }
        return {
          ...current,
          pages: current.pages.map((page, index) => ({
            ...page,
            count: result.total,
            events: index === 0
              ? [result.event, ...page.events]
              : page.events,
          })),
        }
      },
    )
  },
})

const errorMessage = computed(() => {
  const error = mutationError.value ?? queryError.value
  if (!error)
    return null
  return toUserMessage(error)
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
        GraphQL Demo
      </h1>
      <p class="mt-2 text-muted">
        Code-first schema and Relay pagination at <code class="text-primary">/api/graphql</code>.
      </p>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-highlighted">
          Counter
        </h2>
      </template>

      <p class="mb-4 text-2xl font-bold tabular-nums">
        Count: {{ data?.count ?? 0 }}
      </p>

      <p v-if="errorMessage" class="mb-4 text-sm text-error">
        {{ errorMessage }}
      </p>

      <UButton
        label="Count"
        icon="i-lucide-plus"
        :loading="mutating || queryLoading"
        @click="increment()"
      />
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold text-highlighted">
          Event feed
        </h2>
      </template>

      <ul v-if="data && data.events.length > 0" class="divide-y divide-default">
        <li
          v-for="event in data.events"
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
