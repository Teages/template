<script setup lang="ts">
import { gazania } from '~/app/utils/gazania'
import { createGraphQLClient, GraphQLRequestError } from '~/app/utils/graphql-client'

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
    pageInfo: data.countEvents.pageInfo,
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

const {
  data,
  pending,
  error,
} = await useAsyncData(
  'count-snapshot',
  async () => mapSnapshot(await fetchSnapshot()),
  {
    default: (): CountSnapshot => ({
      count: 0,
      events: [],
      pageInfo: { endCursor: null, hasNextPage: false },
    }),
  },
)

const errorMessage = computed(() => {
  if (!error.value)
    return null
  return toUserMessage(error.value)
})

const mutating = ref(false)
const loadingMore = ref(false)

async function increment(): Promise<void> {
  mutating.value = true
  try {
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
    data.value = {
      ...data.value,
      count: result.recordCount.totalCount,
      events: [mapEvent(result.recordCount.countEvent), ...data.value.events],
    }
    error.value = null
  }
  catch (e) {
    error.value = e instanceof Error ? e : new Error(toUserMessage(e))
  }
  finally {
    mutating.value = false
  }
}

async function loadMore(): Promise<void> {
  const { endCursor, hasNextPage } = data.value.pageInfo
  if (!hasNextPage || !endCursor)
    return
  loadingMore.value = true
  try {
    const next = mapSnapshot(await fetchSnapshot(endCursor))
    data.value = {
      count: next.count,
      events: [...data.value.events, ...next.events],
      pageInfo: next.pageInfo,
    }
  }
  catch (e) {
    error.value = e instanceof Error ? e : new Error(toUserMessage(e))
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
        :loading="mutating || pending"
        @click="increment"
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

      <template v-if="data.pageInfo.hasNextPage" #footer>
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
