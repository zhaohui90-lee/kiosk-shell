import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { RIME_RESULT } from '@kiosk/shared'
import {
  applyUnhandledKeyToTarget,
  buildKeyboardRows,
  coerceKeyboardTarget,
  deleteBackwardAtSelection,
  insertTextAtSelection,
  isPrintableInput,
  isSupportedKeyboardTarget,
  resolveCompositionState,
  resolveKeyValue,
  resolvePreferredKeyboardMode,
  type KeyboardAction,
  type KeyboardKey,
  type KeyboardMode,
} from '../../core/keyboard-model'
import type { VirtualKeyboardOptions } from '../../types'

const ACTIVE_ELEMENT_SYNC_INTERVAL_MS = 180

function isEditableElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  return isSupportedKeyboardTarget(coerceKeyboardTarget(target))
}

function normalizeImePayload(payload: RIME_RESULT | string | null): RIME_RESULT | null {
  if (!payload) return null
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as Partial<RIME_RESULT>
      return typeof parsed.state === 'number' ? (parsed as RIME_RESULT) : null
    } catch {
      return null
    }
  }
  return payload
}

export function candidateLabel(index: number): string {
  return index === 9 ? '0' : String(index + 1)
}

export type UseVirtualKeyboardReturn = {
  activeTarget: Ref<HTMLInputElement | HTMLTextAreaElement | null>
  isVisible: Ref<boolean>
  mode: Ref<KeyboardMode>
  shifted: Ref<boolean>
  composing: Ref<boolean>
  compositionText: Ref<string>
  candidates: Ref<Array<{ text: string; comment?: string }>>
  currentPage: Ref<number>
  isLastPage: Ref<boolean>
  statusText: ComputedRef<string>
  keyboardRows: ComputedRef<KeyboardKey[][]>
  show: () => void
  hide: (force?: boolean) => void
  cancelHide: () => void
  focusActiveTarget: () => void
  handleKeyClick: (key: KeyboardKey) => void
  onKeyPointerDown: (key: KeyboardKey) => void
  onKeyPointerUp: () => void
  handleCandidateClick: (index: number) => void
  nextPage: () => void
  prevPage: () => void
  onKeyboardPointerDown: () => void
}

export function useVirtualKeyboard(
  rootEl: Ref<HTMLElement | null>,
  options: VirtualKeyboardOptions,
): UseVirtualKeyboardReturn {
  const {
    api,
    defaultSchema = 'luna_pinyin',
    candidatePageSize = 5,
    hideDelayMs = 160,
    showEmoji = false,
    simplified = true,
  } = options

  // ── Reactive state ────────────────────────────────────────────────────────
  const activeTarget = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const isVisible = ref(false)
  const mode = ref<KeyboardMode>('zh')
  const shifted = ref(false)
  const composing = ref(false)
  const compositionText = ref('')
  const candidates = ref<Array<{ text: string; comment?: string }>>([])
  const currentPage = ref(0)
  const isLastPage = ref(true)

  let imeInitialized = false
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let syncTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let longPressTriggered = false

  // ── Computed ──────────────────────────────────────────────────────────────
  const statusText = computed<string>(() => {
    if (composing.value) return '候选可点击，空格选首项'
    switch (mode.value) {
      case 'zh': return '中文拼音'
      case 'en': return shifted.value ? '英文大写' : '英文小写'
      case 'num': return '数字键盘'
      default: return ''
    }
  })

  const keyboardRows = computed(() => buildKeyboardRows(mode.value, shifted.value))

  // ── Focus helpers ─────────────────────────────────────────────────────────
  function focusActiveTarget(): void {
    activeTarget.value?.focus({ preventScroll: true })
  }

  function cancelHide(): void {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function getActiveEditable(): HTMLInputElement | HTMLTextAreaElement | null {
    const el = document.activeElement
    return isEditableElement(el) ? el : null
  }

  function show(): void {
    if (!activeTarget.value) return
    cancelHide()
    isVisible.value = true
    focusActiveTarget()
  }

  function hide(force = false): void {
    cancelHide()
    isVisible.value = false
    if (force) {
      activeTarget.value?.blur()
      activeTarget.value = null
    }
    resetComposition()
  }

  function scheduleHide(): void {
    cancelHide()
    hideTimer = setTimeout(() => {
      if (!isVisible.value) return
      const activeEl = document.activeElement
      if (activeEl && rootEl.value?.contains(activeEl)) return
      hide()
    }, hideDelayMs)
  }

  function activateTarget(target: HTMLInputElement | HTMLTextAreaElement): void {
    const nextMode = resolvePreferredKeyboardMode(target)
    if (activeTarget.value !== target) resetComposition()
    activeTarget.value = target
    mode.value = nextMode
    shifted.value = false
    show()
  }

  function scheduleActiveElementSync(): void {
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null }
    syncTimer = setTimeout(() => {
      const el = getActiveEditable()
      if (el) activateTarget(el)
    }, 0)
  }

  function eventPathIncludesRoot(event: Event): boolean {
    if (!rootEl.value) return false
    const e = event as Event & { composedPath?: () => EventTarget[] }
    return typeof e.composedPath === 'function' && e.composedPath().includes(rootEl.value)
  }

  // ── Document event handlers ───────────────────────────────────────────────
  const handleFocusIn = (event: FocusEvent): void => {
    if (!isEditableElement(event.target)) { scheduleActiveElementSync(); return }
    activateTarget(event.target)
  }

  const handleFocusOut = (event: FocusEvent): void => {
    if (!activeTarget.value || event.target !== activeTarget.value) return
    scheduleHide()
  }

  const handleDocumentPointerDown = (event: PointerEvent): void => {
    if (eventPathIncludesRoot(event)) return
    if (isEditableElement(event.target)) { activateTarget(event.target); return }
    scheduleActiveElementSync()
    scheduleHide()
  }

  function startPolling(): void {
    pollTimer = setInterval(() => {
      const el = getActiveEditable()
      if (el) {
        if (activeTarget.value !== el || !isVisible.value) activateTarget(el)
        return
      }
      if (isVisible.value) {
        const activeEl = document.activeElement
        const keyboardFocused = !!activeEl && !!rootEl.value && rootEl.value.contains(activeEl)
        if (!keyboardFocused) hide()
      }
    }, ACTIVE_ELEMENT_SYNC_INTERVAL_MS)
  }

  function stopPolling(): void {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  }

  // ── IME ───────────────────────────────────────────────────────────────────
  async function ensureImeReady(): Promise<void> {
    if (imeInitialized) return
    try {
      await api.imeSetSchema(defaultSchema)
      await api.imeSetPageSize(candidatePageSize)
      await api.imeSetOption('emoji_suggestion', showEmoji)
      await api.imeSetOption('simplification', simplified)
      imeInitialized = true
    } catch {
      // initialization failed; will retry on next key press
    }
  }

  function resetComposition(): void {
    composing.value = false
    compositionText.value = ''
    candidates.value = []
    currentPage.value = 0
    isLastPage.value = true
  }

  function dispatchInputEvent(): void {
    if (!activeTarget.value) return
    activeTarget.value.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    focusActiveTarget()
  }

  function handleImeResult(result: RIME_RESULT, inputKey: string): void {
    if (!activeTarget.value) return
    switch (result.state) {
      case 0:
        if (result.committed && insertTextAtSelection(activeTarget.value, result.committed)) {
          dispatchInputEvent()
        }
        resetComposition()
        return
      case 1: {
        if (result.committed && insertTextAtSelection(activeTarget.value, result.committed)) {
          dispatchInputEvent()
        }
        const comp = resolveCompositionState(result)
        composing.value = true
        compositionText.value = comp?.text ?? ''
        candidates.value = comp?.candidates ?? []
        currentPage.value = comp?.page ?? 0
        isLastPage.value = comp?.isLastPage ?? true
        return
      }
      case 2:
        resetComposition()
        return
      case 3:
        if (isPrintableInput(inputKey) && !composing.value) {
          if (insertTextAtSelection(activeTarget.value, inputKey)) dispatchInputEvent()
        } else if (applyUnhandledKeyToTarget(activeTarget.value, inputKey)) {
          dispatchInputEvent()
        } else {
          resetComposition()
        }
    }
  }

  async function processImeKey(key: string): Promise<void> {
    if (!activeTarget.value) return
    await ensureImeReady()
    try {
      const result = await api.imeProcessInput(key)
      handleImeResult(result, key)
    } catch {
      if (isPrintableInput(key) && activeTarget.value && insertTextAtSelection(activeTarget.value, key)) {
        dispatchInputEvent()
      }
    }
  }

  async function clearImeComposition(): Promise<void> {
    try {
      const result = await api.imeProcessInput('Escape')
      if (result.state === 0 && result.committed && activeTarget.value) {
        if (insertTextAtSelection(activeTarget.value, result.committed)) dispatchInputEvent()
      }
    } catch { /* best-effort cleanup */ }
    resetComposition()
  }

  async function switchMode(nextMode: KeyboardMode): Promise<void> {
    if (mode.value === nextMode) return
    if (composing.value) await clearImeComposition()
    mode.value = nextMode
    shifted.value = false
  }

  async function handleAction(action: KeyboardAction): Promise<void> {
    switch (action) {
      case 'shift':
        shifted.value = !shifted.value
        return
      case 'backspace':
        if (!activeTarget.value) return
        if (mode.value === 'zh' && composing.value) { await processImeKey('BackSpace'); return }
        if (deleteBackwardAtSelection(activeTarget.value)) dispatchInputEvent()
        return
      case 'space':
        await handleKeyPress(' ')
        return
      case 'enter':
        if (!activeTarget.value) return
        if (mode.value === 'zh' && composing.value) { await processImeKey('Return'); return }
        if (activeTarget.value instanceof HTMLTextAreaElement) {
          if (insertTextAtSelection(activeTarget.value, '\n')) dispatchInputEvent()
          return
        }
        hide(true)
        return
      case 'hide':
        hide(true)
        return
      case 'mode-zh': await switchMode('zh'); return
      case 'mode-en': await switchMode('en'); return
      case 'mode-num': await switchMode('num'); return
    }
  }

  async function handleKeyPress(rawKey: string): Promise<void> {
    if (!activeTarget.value) return
    if (mode.value === 'num') {
      if (insertTextAtSelection(activeTarget.value, rawKey)) dispatchInputEvent()
      return
    }
    const value = resolveKeyValue(mode.value, shifted.value, rawKey)
    if (mode.value === 'en') {
      if (insertTextAtSelection(activeTarget.value, value)) dispatchInputEvent()
      return
    }
    if (composing.value && /^[0-9]$/.test(value)) {
      const idx = value === '0' ? 9 : Number(value) - 1
      if (idx >= 0 && idx < candidates.value.length) { await selectCandidate(idx); return }
    }
    if (/^[0-9]$/.test(value) && !composing.value) {
      if (insertTextAtSelection(activeTarget.value, value)) dispatchInputEvent()
      return
    }
    await processImeKey(value)
  }

  async function selectCandidate(index: number): Promise<void> {
    if (!activeTarget.value) return
    try {
      const response = await api.imeSelectCandidate(index)
      const normalized = normalizeImePayload(response)
      if (normalized) { handleImeResult(normalized, ''); return }
      if (response && insertTextAtSelection(activeTarget.value, response)) dispatchInputEvent()
      resetComposition()
    } catch {
      resetComposition()
    }
  }

  // ── Long-press clear ──────────────────────────────────────────────────────
  async function clearInput(): Promise<void> {
    if (!activeTarget.value) return
    if (composing.value) {
      try { await api.imeProcessInput('Escape') } catch { /* best-effort */ }
      resetComposition()
    }
    if (!activeTarget.value) return
    activeTarget.value.value = ''
    activeTarget.value.setSelectionRange(0, 0)
    dispatchInputEvent()
  }

  // ── Public keyboard event handlers ────────────────────────────────────────
  function handleKeyClick(key: KeyboardKey): void {
    if (key.action === 'backspace' && longPressTriggered) {
      longPressTriggered = false
      return
    }
    if (key.action) void handleAction(key.action)
    else if (key.value) void handleKeyPress(key.value)
  }

  function onKeyPointerDown(key: KeyboardKey): void {
    if (key.action !== 'backspace') return
    longPressTriggered = false
    longPressTimer = setTimeout(() => {
      longPressTriggered = true
      longPressTimer = null
      void clearInput()
    }, 600)
  }

  function onKeyPointerUp(): void {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function handleCandidateClick(index: number): void {
    void selectCandidate(index)
  }

  function nextPage(): void {
    if (!isLastPage.value) void processImeKey('Page_Down')
  }

  function prevPage(): void {
    if (currentPage.value > 0) void processImeKey('Page_Up')
  }

  function onKeyboardPointerDown(): void {
    cancelHide()
    focusActiveTarget()
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMounted(() => {
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    document.addEventListener('pointerdown', handleDocumentPointerDown, true)
    startPolling()
    void ensureImeReady()
  })

  onUnmounted(() => {
    document.removeEventListener('focusin', handleFocusIn, true)
    document.removeEventListener('focusout', handleFocusOut, true)
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
    stopPolling()
    cancelHide()
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null }
  })

  return {
    activeTarget,
    isVisible,
    mode,
    shifted,
    composing,
    compositionText,
    candidates,
    currentPage,
    isLastPage,
    statusText,
    keyboardRows,
    show,
    hide,
    cancelHide,
    focusActiveTarget,
    handleKeyClick,
    onKeyPointerDown,
    onKeyPointerUp,
    handleCandidateClick,
    nextPage,
    prevPage,
    onKeyboardPointerDown,
  }
}
