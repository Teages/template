import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import TodoCreateForm from '~/components/todo/TodoCreateForm.vue'

describe('component: TodoCreateForm', () => {
  it('disables submit when the title is blank', async () => {
    const wrapper = await mountSuspended(TodoCreateForm)

    const submit = wrapper.find('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
  })

  it('emits create with a trimmed title and clears the input', async () => {
    const wrapper = await mountSuspended(TodoCreateForm)

    const input = wrapper.find('input')
    await input.setValue('  Ship tests  ')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('create')).toEqual([['Ship tests']])
    await vi.waitFor(() => {
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    })
  })
})
