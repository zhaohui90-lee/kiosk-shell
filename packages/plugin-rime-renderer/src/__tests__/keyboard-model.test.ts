import { describe, it, expect } from 'vitest'
import {
  applyUnhandledKeyToTarget,
  buildKeyboardRows,
  coerceKeyboardTarget,
  insertTextAtSelection,
  isSupportedKeyboardTarget,
  resolveKeyValue,
  resolvePreferredKeyboardMode,
  type KeyboardTargetLike,
} from '../core/keyboard-model'

function createTarget(overrides: Partial<KeyboardTargetLike> = {}): KeyboardTargetLike {
  const target: KeyboardTargetLike = {
    tagName: 'INPUT',
    type: 'text',
    value: '',
    disabled: false,
    readOnly: false,
    selectionStart: 0,
    selectionEnd: 0,
    setSelectionRange(start: number, end: number) {
      target.selectionStart = start
      target.selectionEnd = end
    },
    ...overrides,
  }
  return target
}

describe('keyboard-model', () => {
  it('recognizes supported targets and resolves preferred mode', () => {
    expect(isSupportedKeyboardTarget(createTarget())).toBe(true)
    expect(isSupportedKeyboardTarget(createTarget({ type: 'hidden' }))).toBe(false)
    expect(resolvePreferredKeyboardMode(createTarget({ type: 'number' }))).toBe('num')
    expect(resolvePreferredKeyboardMode(createTarget({ type: 'email' }))).toBe('en')
    expect(resolvePreferredKeyboardMode(createTarget({ tagName: 'TEXTAREA', type: undefined }))).toBe('zh')
  })

  it('coerces editable targets without relying on browser instanceof checks', () => {
    const targetLike = {
      tagName: 'INPUT',
      type: 'text',
      value: 'abc',
      selectionStart: 0,
      selectionEnd: 0,
      setSelectionRange() {},
    }

    expect(coerceKeyboardTarget(targetLike)).toEqual(targetLike)
    expect(coerceKeyboardTarget({ tagName: 'DIV' })).toBeNull()
  })

  it('inserts text at the current selection and updates caret', () => {
    const target = createTarget({ value: 'nihao', selectionStart: 2, selectionEnd: 4 })

    const inserted = insertTextAtSelection(target, 'X')

    expect(inserted).toBe(true)
    expect(target.value).toBe('niXo')
    expect(target.selectionStart).toBe(3)
    expect(target.selectionEnd).toBe(3)
  })

  it('applies unhandled cursor and deletion keys directly to the target', () => {
    const target = createTarget({ value: 'abc', selectionStart: 3, selectionEnd: 3 })

    expect(applyUnhandledKeyToTarget(target, 'BackSpace')).toBe(true)
    expect(target.value).toBe('ab')
    expect(applyUnhandledKeyToTarget(target, 'Home')).toBe(true)
    expect(target.selectionStart).toBe(0)
    expect(target.selectionEnd).toBe(0)
    expect(applyUnhandledKeyToTarget(target, 'ArrowRight')).toBe(true)
    expect(target.selectionStart).toBe(1)
  })

  it('renders alpha and numeric layouts for different modes', () => {
    const enRows = buildKeyboardRows('en', true)
    const zhRows = buildKeyboardRows('zh', false)
    const numRows = buildKeyboardRows('num', false)

    // Alpha rows: standard 4-row mobile layout
    expect(enRows[0]?.[0]?.label).toBe('Q')
    expect(enRows[2]?.[0]?.action).toBe('shift')
    expect(enRows.length).toBe(4)

    // zh bottom row: 英文 | 123 | ， | 空格 | 。 | 完成
    expect(zhRows[3]?.length).toBe(6)
    expect(zhRows[3]?.[0]?.action).toBe('mode-en')
    expect(zhRows[3]?.[0]?.label).toBe('英文')
    expect(zhRows[3]?.[3]?.action).toBe('space')
    expect(zhRows[3]?.[5]?.action).toBe('enter')

    // en bottom row: 中文 | 123 | , | 空格 | . | 完成
    expect(enRows[3]?.[0]?.action).toBe('mode-zh')
    expect(enRows[3]?.[0]?.label).toBe('中文')

    // Num mode: 4 rows (3x3 + bottom)
    expect(numRows.length).toBe(4)
    expect(numRows[0]?.length).toBe(3)
    expect(numRows[3]?.[2]?.value).toBe('0')
    expect(numRows[3]?.[4]?.action).toBe('backspace')
  })

  it('resolves english key casing without affecting other modes', () => {
    expect(resolveKeyValue('en', false, 'a')).toBe('a')
    expect(resolveKeyValue('en', true, 'a')).toBe('A')
    expect(resolveKeyValue('zh', true, 'a')).toBe('a')
    expect(resolveKeyValue('num', false, '1')).toBe('1')
  })
})
