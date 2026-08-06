import type { $Fetch } from 'ofetch'

export interface RestCountEvent {
  readonly id: string
  readonly userName: string
  readonly userEmail: string
  readonly createdAt: string
}

export interface RestCountEventPage {
  readonly data: readonly RestCountEvent[]
  readonly meta: {
    readonly total: number
    readonly nextCursor: string | null
  }
}

export function createRestClient($fetch: $Fetch) {
  return {
    listCountEvents(options?: { limit?: number, cursor?: string }) {
      return $fetch<RestCountEventPage>('/api/count-events', {
        query: options,
      })
    },
    createCountEvent() {
      return $fetch<{ data: RestCountEvent }>('/api/count-events', {
        method: 'POST',
      })
    },
  }
}
