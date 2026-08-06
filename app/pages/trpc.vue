<script setup lang="ts">
import { TRPCClientError } from '@trpc/client'
import { trpc } from '~/app/utils/trpc-client'

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

interface CountEvent {
  readonly id: string
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

interface CountSnapshot {
  readonly count: number
  readonly events: readonly CountEvent[]
}

function mapError(cause: unknown): string {
  if (cause instanceof TRPCClientError && cause.data?.code === 'UNAUTHORIZED') {
    return 'You must sign in to view the counter.'
  }
  if (cause instanceof Error) {
    return cause.message
  }
  return 'Unexpected error'
}

const { data, pending, error, refresh } = await useAsyncData<CountSnapshot>(
  'trpc-count-snapshot',
  async () => trpc.count.snapshot.query(),
  { default: (): CountSnapshot => ({ count: 0, events: [] }) },
)

const countError = computed(() => error.value ? mapError(error.value) : null)
const mutating = ref(false)

async function recordCount(): Promise<void> {
  mutating.value = true
  try {
    await trpc.count.record.mutate()
    await refresh()
  }
  catch (cause: unknown) {
    error.value = cause instanceof Error ? cause : new Error(mapError(cause))
  }
  finally {
    mutating.value = false
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
            <code>count.snapshot</code>
            /
            <code>count.record</code>
          </h2>
        </div>
      </template>

      <p class="mb-4 text-2xl font-bold tabular-nums">
        Count: {{ data?.count ?? 0 }}
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
    </UCard>
  </div>
</template>
