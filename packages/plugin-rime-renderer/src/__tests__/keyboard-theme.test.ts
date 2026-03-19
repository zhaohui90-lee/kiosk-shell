import { describe, expect, it } from 'vitest'
import { buildKeyboardCss } from '../vue/keyboard-theme'

describe('keyboard-theme', () => {
  it('builds the reference-inspired keyboard shell styles with responsive layout rules', () => {
    const css = buildKeyboardCss('__virtual_keyboard_test__', 99)

    expect(css).toContain('#__virtual_keyboard_test__')
    expect(css).toContain('z-index: 99;')
    expect(css).toContain('env(safe-area-inset-bottom, 0px)')
    expect(css).toContain('.vk-row.is-alpha-row-2')
    expect(css).toContain('.vk-row.is-num-row-4')
    expect(css).toContain('.vk-key.is-enter')
    expect(css).toContain('.vk-key.is-mode-switch')
    expect(css).toContain('linear-gradient(180deg, var(--vk-bg-top) 0%')
  })
})
