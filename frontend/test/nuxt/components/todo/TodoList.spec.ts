import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TodoList from '~/components/todo/TodoList.vue'

describe('component: TodoList', () => {
  it('shows skeletons while the initial load is pending', async () => {
    const wrapper = await mountSuspended(TodoList, {
      props: {
        items: [],
        status: 'pending',
        busyId: null,
      },
    })

    expect(wrapper.findAll('[role="alert"][aria-busy="true"]').length).toBeGreaterThan(0)
  })

  it('shows the empty state when there are no items', async () => {
    const wrapper = await mountSuspended(TodoList, {
      props: {
        items: [],
        status: 'success',
        busyId: null,
      },
    })

    expect(wrapper.text()).toContain('No todos yet')
  })

  it('shows the error state with a retry action', async () => {
    const wrapper = await mountSuspended(TodoList, {
      props: {
        items: [],
        status: 'error',
        busyId: null,
      },
    })

    expect(wrapper.text()).toContain('Could not load todos')
    expect(wrapper.find('button').text()).toContain('Retry')
  })

  it('renders todos and emits toggle', async () => {
    const wrapper = await mountSuspended(TodoList, {
      props: {
        items: [{ id: '1', title: 'Write tests', completed: false }],
        status: 'success',
        busyId: null,
      },
    })

    expect(wrapper.text()).toContain('Write tests')

    await wrapper.find('[role="checkbox"]').trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([['1', true]])
  })
})
