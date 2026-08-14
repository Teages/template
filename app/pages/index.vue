<script setup lang="ts">
import { setInfiniteQueryData, useInfiniteQuery, useMutation, useQueryCache } from '@pinia/colada'
import { formatWhen } from '~/app/utils/format-when'
import { COUNT_QUERY_KEYS } from '~/app/utils/query-keys'
import { createGraphQLClient, GraphQLRequestError } from '~/plugins/graphql-schema/runtime/app/client'
import { gazania } from '~/plugins/graphql-schema/runtime/shared/gazania'
import { useAppContext } from '~/plugins/vue-ssr/runtime/app/composables/useAppContext'

const graphql = createGraphQLClient(useAppContext().$requestFetch)

useHead({ title: 'GraphQL Demo' })

interface CountEvent {
  readonly id: string
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

/** One fetched page of the count snapshot; auth failures map to `unauthorized`. */
type SnapshotPage
  = | { readonly kind: 'unauthorized' }
    | {
      readonly kind: 'ready'
      readonly count: number
      readonly events: readonly CountEvent[]
      readonly endCursor: string | null
      readonly hasNextPage: boolean
    }

const PAGE_SIZE = 20

const CountSnapshotQuery = gazania.query('CountSnapshot')
  .vars({ first: 'Int!', after: 'String' })
  .select(($, vars) => $.select([{
    count: $ => $.select([
      '__typename',
      { '... on QueryCountSuccess': $ => $.select(['data']) },
    ]),
    countEvents: $ => $.args({ first: vars.first, after: vars.after }).select([
      '__typename',
      {
        '... on QueryCountEventsConnection': $ => $.select([{
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
    ]),
  }]))

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

function mapSnapshotPage(data: Awaited<ReturnType<typeof fetchSnapshot>>): SnapshotPage {
  if (
    data.count.__typename === 'UnauthorizedError'
    || data.countEvents.__typename === 'UnauthorizedError'
  ) {
    return { kind: 'unauthorized' }
  }
  return {
    kind: 'ready',
    count: data.count.data,
    events: data.countEvents.edges.map(edge => mapEvent(edge.node)),
    endCursor: data.countEvents.pageInfo.endCursor ?? null,
    hasNextPage: data.countEvents.pageInfo.hasNextPage,
  }
}

async function fetchSnapshot(after?: string) {
  return graphql.request(CountSnapshotQuery, {
    first: PAGE_SIZE,
    after,
  })
}

function toUserMessage(e: unknown): string {
  if (e instanceof GraphQLRequestError)
    return e.errors.map(err => err.message).join('\n')
  if (e instanceof Error)
    return e.message
  return 'Unexpected error'
}

const queryCache = useQueryCache()
const {
  data: queryData,
  error: queryError,
  hasNextPage,
  isLoading: queryLoading,
  loadNextPage,
} = useInfiniteQuery<SnapshotPage, Error, string | null>({
  key: COUNT_QUERY_KEYS.graphql,
  initialPageParam: null,
  query: async ({ pageParam }) => mapSnapshotPage(
    await fetchSnapshot(pageParam ?? undefined),
  ),
  getNextPageParam: lastPage =>
    lastPage.kind === 'ready' && lastPage.hasNextPage
      ? lastPage.endCursor
      : null,
})

type ReadySnapshotPage = Extract<SnapshotPage, { kind: 'ready' }>

const snapshot = computed(() => {
  const pages = queryData.value?.pages ?? []
  const readyPages = pages.filter((page): page is ReadySnapshotPage => page.kind === 'ready')
  return {
    unauthorized: pages[0]?.kind === 'unauthorized',
    count: readyPages[0]?.count ?? 0,
    events: readyPages.flatMap(page => page.events),
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
            '__typename',
            {
              '... on RecordCountPayload': $ => $.select([
                'totalCount',
                {
                  countEvent: $ => $.select([
                    'id',
                    'createdAt',
                    { user: $ => $.select(['name', 'email']) },
                  ]),
                },
              ]),
            },
          ]),
        }])),
    )
    if (result.recordCount.__typename === 'UnauthorizedError') {
      // Domain errors resolve as data; surface them through the mutation
      // error path so the existing error banner renders them.
      throw new Error('You must sign in to view the counter')
    }
    return {
      event: mapEvent(result.recordCount.countEvent),
      total: result.recordCount.totalCount,
    }
  },
  onSuccess(result) {
    setInfiniteQueryData<SnapshotPage, Error, string | null>(
      queryCache,
      COUNT_QUERY_KEYS.graphql,
      (current) => {
        if (!current?.pages.length) {
          return {
            pages: [{
              kind: 'ready',
              count: result.total,
              events: [result.event],
              endCursor: null,
              hasNextPage: false,
            }],
            pageParams: [null],
          }
        }
        return {
          ...current,
          pages: current.pages.map((page, index) => {
            if (index !== 0)
              return page
            const previous = page.kind === 'ready' ? page : null
            return {
              kind: 'ready',
              count: result.total,
              events: [result.event, ...(previous?.events ?? [])],
              endCursor: previous?.endCursor ?? null,
              hasNextPage: previous?.hasNextPage ?? false,
            } satisfies ReadySnapshotPage
          }),
        }
      },
    )
  },
})

const errorMessage = computed(() => {
  if (snapshot.value.unauthorized)
    return 'You must sign in to view the counter'
  const error = mutationError.value ?? queryError.value
  return error ? toUserMessage(error) : null
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
        Count: {{ snapshot.count }}
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

      <ul v-if="snapshot.events.length > 0" class="divide-y divide-default">
        <li
          v-for="event in snapshot.events"
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
