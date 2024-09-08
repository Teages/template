import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Button } from '../src/components'

describe('package-name/components/button', () => {
  it('default', () => {
    const wrapper = mount(Button, {})

    expect(wrapper.text()).toContain('It is a button')
  })

  it('contents', () => {
    const wrapper = mount(Button, {
      props: {
        content: 'Hello',
      },
    })

    expect(wrapper.text()).toContain('Hello')
  })
})
