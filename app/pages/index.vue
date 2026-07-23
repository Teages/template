<script setup lang="ts">
import type { TodoListItem } from '~/components/todo/TodoList.vue'
import { GraphQLRequestError } from '~/utils/graphql-client'

definePageMeta({
  middleware: 'auth',
})

const TodosQuery = gazania.query('TodoPageTodos')
  .vars({ first: 'Int!' })
  .select(($, vars) => $.select([{
    todos: $ => $.args({ first: vars.first }).select([{
      edges: $ => $.select([{
        node: $ => $.select(['id', 'title', 'completed']),
      }]),
    }]),
  }]))

const CreateTodoMutation = gazania.mutation('TodoPageCreate')
  .vars({ input: 'CreateTodoInput!' })
  .select(($, vars) => $.select([{
    createTodo: $ => $.args({ input: vars.input }).select(['id', 'title', 'completed']),
  }]))

const UpdateTodoMutation = gazania.mutation('TodoPageUpdate')
  .vars({ input: 'UpdateTodoInput!' })
  .select(($, vars) => $.select([{
    updateTodo: $ => $.args({ input: vars.input }).select(['id', 'title', 'completed']),
  }]))

const DeleteTodoMutation = gazania.mutation('TodoPageDelete')
  .vars({ input: 'DeleteTodoInput!' })
  .select(($, vars) => $.select([{
    deleteTodo: $ => $.args({ input: vars.input }).select(['success', 'id']),
  }]))

const api = useApiClient()
const toast = useToast()
const busyId = ref<string | null>(null)

const { data, status, error, refresh } = await useAsyncData(
  'todos',
  () => api.request(TodosQuery, { first: 50 }),
)

const items = computed((): TodoListItem[] => {
  const edges = data.value?.todos?.edges ?? []
  return edges.flatMap((edge) => {
    const node = edge?.node
    if (!node?.id || node.title == null || node.completed == null)
      return []
    return [{
      id: String(node.id),
      title: node.title,
      completed: node.completed,
    }]
  })
})

function showError(cause: unknown, fallback: string) {
  const description = cause instanceof GraphQLRequestError
    ? cause.message
    : cause instanceof Error
      ? cause.message
      : fallback
  toast.add({ title: fallback, description, color: 'error' })
}

async function onCreate(title: string) {
  try {
    await api.request(CreateTodoMutation, { input: { title } })
    await refresh()
  }
  catch (cause) {
    showError(cause, 'Could not create todo')
  }
}

async function onToggle(id: string, completed: boolean) {
  busyId.value = id
  try {
    await api.request(UpdateTodoMutation, { input: { id, completed } })
    await refresh()
  }
  catch (cause) {
    showError(cause, 'Could not update todo')
  }
  finally {
    busyId.value = null
  }
}

async function onRemove(id: string) {
  busyId.value = id
  try {
    await api.request(DeleteTodoMutation, { input: { id } })
    await refresh()
  }
  catch (cause) {
    showError(cause, 'Could not delete todo')
  }
  finally {
    busyId.value = null
  }
}

if (import.meta.dev && error.value) {
  console.error('[todos]', error.value)
}
</script>

<template>
  <UContainer class="py-8">
    <UPageSection
      title="Todos"
      description="GraphQL-backed todo task list."
    >
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <TodoCreateForm @create="onCreate" />
        <TodoList
          :items
          :status
          :busy-id
          @retry="refresh()"
          @toggle="onToggle"
          @remove="onRemove"
        />
      </div>
    </UPageSection>
  </UContainer>
</template>
