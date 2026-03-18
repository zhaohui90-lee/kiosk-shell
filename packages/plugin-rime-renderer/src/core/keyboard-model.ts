import type { RIME_RESULT, RimeCandidate } from '@kiosk/shared'

export type KeyboardMode = 'zh' | 'en' | 'num'

export type KeyboardAction =
  | 'shift'
  | 'backspace'
  | 'space'
  | 'enter'
  | 'hide'
  | 'mode-zh'
  | 'mode-en'
  | 'mode-num'

export type KeyboardKey = {
  id: string
  label: string
  value?: string
  action?: KeyboardAction
  variant?: 'default' | 'muted' | 'accent'
  width?: 'normal' | 'wide' | 'grow'
}

export type KeyboardTargetLike = {
  tagName: string
  type?: string
  value: string
  disabled?: boolean
  readOnly?: boolean
  selectionStart: number | null
  selectionEnd: number | null
  setSelectionRange: (start: number, end: number) => void
  dispatchEvent?: (event: Event) => boolean
}

export type CompositionState = {
  text: string
  candidates: RimeCandidate[]
  highlighted: number
}

export function coerceKeyboardTarget(target: unknown): KeyboardTargetLike | null {
  if (!target || typeof target !== 'object') {
    return null
  }

  const candidate = target as Partial<KeyboardTargetLike>
  if (typeof candidate.tagName !== 'string') {
    return null
  }

  if (typeof candidate.value !== 'string') {
    return null
  }

  if (typeof candidate.setSelectionRange !== 'function') {
    return null
  }

  return candidate as KeyboardTargetLike
}

const UNSUPPORTED_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

function normalizeSelection(target: KeyboardTargetLike): { start: number; end: number } {
  const length = target.value.length
  const rawStart = target.selectionStart ?? length
  const rawEnd = target.selectionEnd ?? rawStart
  const start = Math.max(0, Math.min(rawStart, rawEnd, length))
  const end = Math.max(start, Math.min(Math.max(rawStart, rawEnd), length))

  return { start, end }
}

function updateTargetValue(
  target: KeyboardTargetLike,
  nextValue: string,
  nextCursorStart: number,
  nextCursorEnd = nextCursorStart,
): void {
  target.value = nextValue
  target.setSelectionRange(nextCursorStart, nextCursorEnd)
}

export function isSupportedKeyboardTarget(target: KeyboardTargetLike | null | undefined): boolean {
  if (!target) {
    return false
  }

  if (target.disabled || target.readOnly) {
    return false
  }

  const tagName = target.tagName.toUpperCase()
  if (tagName === 'TEXTAREA') {
    return true
  }

  if (tagName !== 'INPUT') {
    return false
  }

  const inputType = (target.type ?? 'text').toLowerCase()
  return !UNSUPPORTED_INPUT_TYPES.has(inputType)
}

export function resolvePreferredKeyboardMode(target: Pick<KeyboardTargetLike, 'tagName' | 'type'>): KeyboardMode {
  const tagName = target.tagName.toUpperCase()
  if (tagName === 'TEXTAREA') {
    return 'zh'
  }

  const inputType = (target.type ?? 'text').toLowerCase()
  if (inputType === 'number' || inputType === 'tel') {
    return 'num'
  }

  if (inputType === 'email' || inputType === 'password' || inputType === 'search' || inputType === 'url') {
    return 'en'
  }

  return 'zh'
}

export function insertTextAtSelection(target: KeyboardTargetLike, text: string): boolean {
  if (!text) {
    return false
  }

  const { start, end } = normalizeSelection(target)
  const nextValue = `${target.value.slice(0, start)}${text}${target.value.slice(end)}`
  const cursor = start + text.length

  updateTargetValue(target, nextValue, cursor)
  return true
}

export function deleteBackwardAtSelection(target: KeyboardTargetLike): boolean {
  const { start, end } = normalizeSelection(target)

  if (start !== end) {
    const nextValue = `${target.value.slice(0, start)}${target.value.slice(end)}`
    updateTargetValue(target, nextValue, start)
    return true
  }

  if (start <= 0) {
    return false
  }

  const nextValue = `${target.value.slice(0, start - 1)}${target.value.slice(end)}`
  updateTargetValue(target, nextValue, start - 1)
  return true
}

export function deleteForwardAtSelection(target: KeyboardTargetLike): boolean {
  const { start, end } = normalizeSelection(target)

  if (start !== end) {
    const nextValue = `${target.value.slice(0, start)}${target.value.slice(end)}`
    updateTargetValue(target, nextValue, start)
    return true
  }

  if (end >= target.value.length) {
    return false
  }

  const nextValue = `${target.value.slice(0, start)}${target.value.slice(end + 1)}`
  updateTargetValue(target, nextValue, start)
  return true
}

export function moveCaret(target: KeyboardTargetLike, delta: number): boolean {
  const { end } = normalizeSelection(target)
  const next = Math.max(0, Math.min(target.value.length, end + delta))
  target.setSelectionRange(next, next)
  return next !== end
}

export function moveCaretToBoundary(target: KeyboardTargetLike, boundary: 'start' | 'end'): boolean {
  const next = boundary === 'start' ? 0 : target.value.length
  const { end } = normalizeSelection(target)
  target.setSelectionRange(next, next)
  return next !== end
}

export function applyUnhandledKeyToTarget(target: KeyboardTargetLike, key: string): boolean {
  switch (key) {
    case 'BackSpace':
    case 'Backspace':
      return deleteBackwardAtSelection(target)
    case 'Delete':
      return deleteForwardAtSelection(target)
    case 'Left':
    case 'ArrowLeft':
      return moveCaret(target, -1)
    case 'Right':
    case 'ArrowRight':
      return moveCaret(target, 1)
    case 'Home':
      return moveCaretToBoundary(target, 'start')
    case 'End':
      return moveCaretToBoundary(target, 'end')
    case 'Return':
    case 'Enter':
      return target.tagName.toUpperCase() === 'TEXTAREA' ? insertTextAtSelection(target, '\n') : false
    case 'Space':
    case ' ':
      return insertTextAtSelection(target, ' ')
    default:
      return false
  }
}

export function isPrintableInput(key: string): boolean {
  return key.length === 1
}

export function resolveKeyValue(mode: KeyboardMode, shifted: boolean, key: string): string {
  if (mode !== 'en') {
    return key
  }

  if (/^[a-z]$/i.test(key)) {
    return shifted ? key.toUpperCase() : key.toLowerCase()
  }

  return key
}

export function buildKeyboardRows(mode: KeyboardMode, shifted: boolean): KeyboardKey[][] {
  // Bottom row varies by active alpha mode
  const alphaBottomRow: KeyboardKey[] =
    mode === 'zh'
      ? [
          { id: 'mode-en', label: '英文', action: 'mode-en', variant: 'muted' },
          { id: 'mode-num', label: '123', action: 'mode-num', variant: 'muted' },
          { id: 'comma', label: '，', value: '，' },
          { id: 'space', label: '空格', action: 'space', width: 'grow' },
          { id: 'period', label: '。', value: '。' },
          { id: 'enter', label: '完成', action: 'enter', variant: 'accent', width: 'wide' },
        ]
      : [
          { id: 'mode-zh', label: '中文', action: 'mode-zh', variant: 'muted' },
          { id: 'mode-num', label: '123', action: 'mode-num', variant: 'muted' },
          { id: 'comma', label: ',', value: ',' },
          { id: 'space', label: '空格', action: 'space', width: 'grow' },
          { id: 'period', label: '.', value: '.' },
          { id: 'enter', label: '完成', action: 'enter', variant: 'accent', width: 'wide' },
        ]

  const alphaRows: KeyboardKey[][] = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((key) => ({
      id: key,
      label: resolveKeyValue(mode, shifted, key),
      value: key,
    })),
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map((key) => ({
      id: key,
      label: resolveKeyValue(mode, shifted, key),
      value: key,
    })),
    [
      { id: 'shift', label: '⇧', action: 'shift', variant: shifted ? 'accent' : 'muted', width: 'wide' },
      ...['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((key) => ({
        id: key,
        label: resolveKeyValue(mode, shifted, key),
        value: key,
      })),
      { id: 'backspace', label: '⌫', action: 'backspace', variant: 'muted', width: 'wide' },
    ],
    alphaBottomRow,
  ]

  if (mode !== 'num') {
    return alphaRows
  }

  return [
    [
      { id: 'at', label: '@', value: '@' },
      ...(['1', '2', '3'] as const).map((v) => ({ id: v, label: v, value: v })),
    ],
    [
      { id: 'percent', label: '%', value: '%' },
      ...(['4', '5', '6'] as const).map((v) => ({ id: v, label: v, value: v })),
    ],
    [
      { id: 'minus', label: '-', value: '-' },
      ...(['7', '8', '9'] as const).map((v) => ({ id: v, label: v, value: v })),
    ],
    [
      { id: 'plus', label: '+', value: '+' },
      { id: 'dot', label: '.', value: '.' },
      { id: '0', label: '0', value: '0' },
      { id: 'x-upper', label: 'X', value: 'X' },
      { id: 'backspace', label: '⌫', action: 'backspace', variant: 'muted' },
    ],
  ]
}

export function resolveCompositionState(result: RIME_RESULT): CompositionState | null {
  if (result.state !== 1) {
    return null
  }

  return {
    text: `${result.head}${result.body}${result.tail}`,
    candidates: Array.isArray(result.candidates) ? result.candidates : [],
    highlighted: result.highlighted,
  }
}
