<script setup lang="ts">
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~/server/trpc/root'
import { TRPCClientError } from '@trpc/client'
import { createTRPCClient } from '~/app/utils/trpc-client'

const trpc = createTRPCClient(useAppContext().$fetch)

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

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(iso))
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

const { data, pending, error } = await useAsyncData<CountPage>(
  'trpc-count-events',
  async () => trpc.count.list.query(),
  { default: (): CountPage => ({ total: 0, items: [], nextCursor: null }) },
)

const countError = computed(() => error.value ? mapError(error.value) : null)
const mutating = ref(false)
const loadingMore = ref(false)

async function recordCount(): Promise<void> {
  mutating.value = true
  try {
    const created = await trpc.count.create.mutate()
    data.value = {
      ...data.value,
      total: created.total,
      items: [created.item, ...data.value.items],
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
  if (!data.value.nextCursor)
    return
  loadingMore.value = true
  try {
    const next = await trpc.count.list.query({ cursor: data.value.nextCursor })
    data.value = {
      total: next.total,
      items: [...data.value.items, ...next.items],
      nextCursor: next.nextCursor,
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
          Server time: {{ formatWhen(greetResult.at) }}
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
            {{ formatWhen(event.createdAt) }}
          </time>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">
        No counts yet. Be the first to click.
      </p>

      <template v-if="data.nextCursor" #footer>
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
