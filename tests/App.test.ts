import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App.vue'
import WidgetApp from '../src/WidgetApp.vue'

describe('FunTime App and WidgetApp UI', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, String(v))
        },
        removeItem: (k: string) => {
          store.delete(k)
        },
        clear: () => {
          store.clear()
        },
      },
    })
    document.documentElement.dataset.theme = 'light'
    window.funtime = undefined
    window.utools = undefined
  })

  it('switches cleanly across all 5 workspaces, theme, and locale', async () => {
    const wrapper = mount(App)

    // Default view: Countdown
    expect(wrapper.find('[data-testid="countdown-display"]').text()).toBe('25:00')

    // Add quick countdown timer
    await wrapper.find('[data-testid="quick-expr-input"]').setValue('10m')
    await wrapper.find('form.quick-form').trigger('submit')
    expect(wrapper.find('[data-testid="countdown-display"]').text()).toBe('10:00')

    // Switch to Stopwatch
    await wrapper.find('[data-testid="nav-stopwatch"]').trigger('click')
    expect(wrapper.find('[data-testid="stopwatch-display"]').exists()).toBe(true)

    // Switch to World Clock
    await wrapper.find('[data-testid="nav-worldclock"]').trigger('click')
    expect(wrapper.find('[data-testid="meeting-slider"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="copy-schedule-btn"]').exists()).toBe(true)

    // Switch to Floating Widget control center
    await wrapper.find('[data-testid="nav-widget"]').trigger('click')
    expect(wrapper.find('[data-testid="floating-widget-surface"]').exists()).toBe(true)
    await wrapper.find('[data-testid="widget-mode-dual"]').trigger('click')
    expect(wrapper.find('.dual-grid').exists()).toBe(true)

    // Switch to Time Calculator
    await wrapper.find('[data-testid="nav-calc"]').trigger('click')
    expect(wrapper.find('[data-testid="calc-diff-output"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="calc-offset-output"]').exists()).toBe(true)

    // Cycle theme: system -> light -> dark
    await wrapper.find('[data-testid="theme-btn"]').trigger('click')
    expect(document.documentElement.dataset.theme).toBe('light')
    await wrapper.find('[data-testid="theme-btn"]').trigger('click')
    expect(document.documentElement.dataset.theme).toBe('dark')

    // Toggle locale zh-CN -> en
    await wrapper.find('[data-testid="locale-btn"]').trigger('click')
    expect(wrapper.text()).toContain('FunTime')

    wrapper.unmount()
  })

  it('mounts standalone WidgetApp and toggles countdown state', async () => {
    const wrapper = mount(WidgetApp)
    expect(wrapper.find('[data-testid="floating-widget-surface"]').exists()).toBe(true)
    expect(wrapper.find('.big-readout').text()).toBe('25:00')

    await wrapper.find('[data-testid="widget-toggle-btn"]').trigger('click')
    expect(wrapper.find('.pulse-dot.running').exists()).toBe(true)

    wrapper.unmount()
  })

  it('validates empty/invalid countdown expressions, supports inline timer rename, and prevents duplicate world clock pins', async () => {
    const wrapper = mount(App)

    // Empty & invalid natural input shows inline error hint
    await wrapper.find('form.quick-form').trigger('submit')
    expect(wrapper.find('.input-err').exists()).toBe(true)
    await wrapper.find('[data-testid="quick-expr-input"]').setValue('not-valid')
    await wrapper.find('form.quick-form').trigger('submit')
    expect(wrapper.find('.input-err').text()).toContain('not-valid')

    // Inline timer rename
    await wrapper.find('[data-testid="timer-label-btn"]').trigger('click')
    const labelInput = wrapper.find('[data-testid="timer-label-input"]')
    await labelInput.setValue('深度编码')
    await labelInput.trigger('keydown.enter')
    expect(wrapper.find('[data-testid="timer-label-btn"]').text()).toBe('深度编码')

    // World clock: prevents duplicate pin and clears search
    await wrapper.find('[data-testid="nav-worldclock"]').trigger('click')
    const initialCards = wrapper.findAll('.clock-card').length
    const search = wrapper.find('[data-testid="world-search-input"]')
    await search.setValue('Tokyo')
    await search.trigger('keydown.enter')
    expect(wrapper.findAll('.clock-card').length).toBe(initialCards)
    expect(wrapper.find('.search-hint').exists()).toBe(true)
    await wrapper.find('[data-testid="world-search-clear"]').trigger('click')
    expect((search.element as HTMLInputElement).value).toBe('')

    wrapper.unmount()
  })
})
