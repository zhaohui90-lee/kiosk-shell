import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyUnhandledKeyToTarget,
  buildKeyboardRows,
  coerceKeyboardTarget,
  insertTextAtSelection,
  isSupportedKeyboardTarget,
  resolveKeyValue,
  resolvePreferredKeyboardMode,
  type KeyboardTargetLike,
} from '../renderer/model'

function createTarget(
  overrides: Partial<KeyboardTargetLike> = {},
): KeyboardTargetLike {
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

describe('virtual-keyboard model', () => {
  it('recognizes supported targets and resolves preferred mode', () => {
    assert.equal(isSupportedKeyboardTarget(createTarget()), true)
    assert.equal(isSupportedKeyboardTarget(createTarget({ type: 'hidden' })), false)
    assert.equal(resolvePreferredKeyboardMode(createTarget({ type: 'number' })), 'num')
    assert.equal(resolvePreferredKeyboardMode(createTarget({ type: 'email' })), 'en')
    assert.equal(resolvePreferredKeyboardMode(createTarget({ tagName: 'TEXTAREA', type: undefined })), 'zh')
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

    assert.deepEqual(coerceKeyboardTarget(targetLike), targetLike)
    assert.equal(coerceKeyboardTarget({ tagName: 'DIV' }), null)
  })

  it('inserts text at the current selection and updates caret', () => {
    const target = createTarget({
      value: 'nihao',
      selectionStart: 2,
      selectionEnd: 4,
    })

    const inserted = insertTextAtSelection(target, 'X')

    assert.equal(inserted, true)
    assert.equal(target.value, 'niXo')
    assert.equal(target.selectionStart, 3)
    assert.equal(target.selectionEnd, 3)
  })

  it('applies unhandled cursor and deletion keys directly to the target', () => {
    const target = createTarget({
      value: 'abc',
      selectionStart: 3,
      selectionEnd: 3,
    })

    assert.equal(applyUnhandledKeyToTarget(target, 'BackSpace'), true)
    assert.equal(target.value, 'ab')
    assert.equal(applyUnhandledKeyToTarget(target, 'Home'), true)
    assert.equal(target.selectionStart, 0)
    assert.equal(target.selectionEnd, 0)
    assert.equal(applyUnhandledKeyToTarget(target, 'ArrowRight'), true)
    assert.equal(target.selectionStart, 1)
  })

  it('renders alpha and numeric layouts for different modes', () => {
    const enRows = buildKeyboardRows('en', true)
    const numRows = buildKeyboardRows('num', false)

    assert.equal(enRows[0]?.[0]?.label, 'Q')
    assert.equal(enRows[2]?.[0]?.action, 'shift')
    assert.equal(numRows[0]?.length, 3)
    assert.equal(numRows[3]?.[2]?.value, '0')
    assert.equal(numRows[4]?.[4]?.action, 'hide')
  })

  it('resolves english key casing without affecting other modes', () => {
    assert.equal(resolveKeyValue('en', false, 'a'), 'a')
    assert.equal(resolveKeyValue('en', true, 'a'), 'A')
    assert.equal(resolveKeyValue('zh', true, 'a'), 'a')
    assert.equal(resolveKeyValue('num', false, '1'), '1')
  })
})
