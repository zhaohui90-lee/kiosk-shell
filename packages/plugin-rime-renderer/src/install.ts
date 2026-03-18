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
} from './core/keyboard-model'

type ImeApi = {
  imeSetSchema: (schemaId: string) => Promise<unknown>
  imeProcessInput: (input: string) => Promise<RIME_RESULT>
  imeSelectCandidate: (index: number) => Promise<string | null>
  imeSetPageSize: (size: number) => Promise<unknown>
  imeSetOption: (option: string, value: boolean) => Promise<unknown>
}

export type VirtualKeyboardOptions = {
  api: ImeApi
  defaultSchema?: string
  candidatePageSize?: number
  hideDelayMs?: number
  zIndex?: number
  showEmoji?: boolean
  simplified?: boolean
}

export type VirtualKeyboardHandle = {
  show: () => void
  hide: (force?: boolean) => void
  destroy: () => void
}

const STYLE_ID = '__kiosk_virtual_keyboard_style'
const ROOT_ID = '__kiosk_virtual_keyboard_root'
const DEFAULT_SCHEMA = 'luna_pinyin'
const DEFAULT_CANDIDATE_PAGE_SIZE = 5
const DEFAULT_HIDE_DELAY_MS = 160
const DEFAULT_Z_INDEX = 2147483646
const ACTIVE_ELEMENT_SYNC_INTERVAL_MS = 180

function normalizeImePayload(payload: RIME_RESULT | string | null): RIME_RESULT | null {
  if (!payload) {
    return null
  }

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

function candidateLabel(index: number): string {
  return index === 9 ? '0' : String(index + 1)
}

function isEditableElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  const editableTarget = coerceKeyboardTarget(target)
  return isSupportedKeyboardTarget(editableTarget)
}

class VirtualKeyboardController {
  private readonly api: ImeApi
  private readonly doc: Document
  private readonly defaultSchema: string
  private readonly candidatePageSize: number
  private readonly hideDelayMs: number
  private readonly zIndex: number
  private readonly showEmoji: boolean
  private readonly simplified: boolean

  private root: HTMLDivElement | null = null
  private statusEl: HTMLSpanElement | null = null
  private compositionEl: HTMLDivElement | null = null
  private candidatesEl: HTMLDivElement | null = null
  private keyboardEl: HTMLDivElement | null = null
  private activeTarget: HTMLInputElement | HTMLTextAreaElement | null = null
  private mode: KeyboardMode = 'zh'
  private shifted = false
  private visible = false
  private composing = false
  private compositionText = ''
  private currentCandidates: Array<{ text: string; comment?: string }> = []
  private imeInitialized = false
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false
  private ready = false
  private activeElementSyncTimer: ReturnType<typeof setTimeout> | null = null
  private activeElementPollTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: VirtualKeyboardOptions) {
    this.api = options.api
    this.doc = document
    this.defaultSchema = options.defaultSchema ?? DEFAULT_SCHEMA
    this.candidatePageSize = options.candidatePageSize ?? DEFAULT_CANDIDATE_PAGE_SIZE
    this.hideDelayMs = options.hideDelayMs ?? DEFAULT_HIDE_DELAY_MS
    this.zIndex = options.zIndex ?? DEFAULT_Z_INDEX
    this.showEmoji = options.showEmoji ?? false
    this.simplified = options.simplified ?? true
  }

  start(): void {
    if (this.doc.readyState === 'loading') {
      this.doc.addEventListener('DOMContentLoaded', this.handleDocumentReady, { once: true })
      return
    }

    this.mount()
  }

  destroy(): void {
    this.destroyed = true
    this.cancelHide()
    this.cancelActiveElementSync()
    this.stopActiveElementPolling()
    this.doc.removeEventListener('DOMContentLoaded', this.handleDocumentReady)
    this.doc.removeEventListener('focusin', this.handleFocusIn, true)
    this.doc.removeEventListener('focusout', this.handleFocusOut, true)
    this.doc.removeEventListener('pointerdown', this.handleDocumentPointerDown, true)
    this.root?.remove()
    this.root = null
    this.statusEl = null
    this.compositionEl = null
    this.candidatesEl = null
    this.keyboardEl = null
    this.activeTarget = null
    this.ready = false
  }

  show(): void {
    if (!this.ready || !this.root || !this.activeTarget) {
      return
    }

    this.cancelHide()
    this.visible = true
    this.root.classList.add('is-visible')
    this.render()
    this.focusActiveTarget()
  }

  hide(force = false): void {
    if (!this.ready || !this.root) {
      return
    }

    this.cancelHide()
    this.visible = false
    this.root.classList.remove('is-visible')

    if (force) {
      this.activeTarget?.blur()
      this.activeTarget = null
    }

    this.resetComposition()
  }

  private readonly handleDocumentReady = (): void => {
    this.mount()
  }

  private mount(): void {
    if (this.destroyed || this.ready) {
      return
    }

    this.ensureStyle()
    this.root = this.createRoot()
    this.doc.body.appendChild(this.root)

    this.statusEl = this.root.querySelector('[data-role="status"]')
    this.compositionEl = this.root.querySelector('[data-role="composition"]')
    this.candidatesEl = this.root.querySelector('[data-role="candidates"]')
    this.keyboardEl = this.root.querySelector('[data-role="keyboard"]')

    this.root.addEventListener('pointerdown', this.handleKeyboardPointerDown)
    this.root.addEventListener('click', this.handleRootClick)

    this.doc.addEventListener('focusin', this.handleFocusIn, true)
    this.doc.addEventListener('focusout', this.handleFocusOut, true)
    this.doc.addEventListener('pointerdown', this.handleDocumentPointerDown, true)

    this.ready = true
    this.startActiveElementPolling()
    void this.ensureImeReady()
    this.render()
  }

  private ensureStyle(): void {
    if (this.doc.getElementById(STYLE_ID)) {
      return
    }

    const style = this.doc.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: ${this.zIndex};
        padding: 12px 14px calc(env(safe-area-inset-bottom, 0px) + 12px);
        background: linear-gradient(180deg, rgba(7, 15, 33, 0.96), rgba(8, 12, 22, 0.99));
        border-top: 1px solid rgba(123, 156, 255, 0.18);
        box-shadow: 0 -18px 44px rgba(0, 0, 0, 0.34);
        transform: translateY(calc(100% + 20px));
        transition: transform 0.24s ease, opacity 0.24s ease;
        opacity: 0;
        pointer-events: none;
        user-select: none;
        font-family: "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      #${ROOT_ID}.is-visible {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      #${ROOT_ID} .vk-shell {
        width: min(100%, 920px);
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${ROOT_ID} .vk-topbar,
      #${ROOT_ID} .vk-composition,
      #${ROOT_ID} .vk-candidates,
      #${ROOT_ID} .vk-row {
        display: flex;
        gap: 8px;
      }
      #${ROOT_ID} .vk-topbar {
        align-items: center;
        justify-content: space-between;
      }
      #${ROOT_ID} .vk-mode-group {
        display: flex;
        gap: 8px;
      }
      #${ROOT_ID} .vk-status {
        color: rgba(210, 222, 255, 0.72);
        font-size: 12px;
        letter-spacing: 0.08em;
      }
      #${ROOT_ID} .vk-composition {
        min-height: 44px;
        align-items: center;
        padding: 0 14px;
        border-radius: 14px;
        background: rgba(18, 29, 55, 0.84);
        color: #f7fbff;
        font-size: 17px;
        border: 1px solid rgba(123, 156, 255, 0.14);
      }
      #${ROOT_ID} .vk-composition.is-idle {
        color: rgba(176, 192, 224, 0.48);
      }
      #${ROOT_ID} .vk-candidates {
        min-height: 44px;
        flex-wrap: wrap;
      }
      #${ROOT_ID} .vk-candidate,
      #${ROOT_ID} .vk-key {
        appearance: none;
        border: 0;
        cursor: pointer;
      }
      #${ROOT_ID} .vk-candidate {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(20, 32, 60, 0.84);
        color: #f6fbff;
        border: 1px solid rgba(123, 156, 255, 0.1);
      }
      #${ROOT_ID} .vk-candidate.is-active {
        background: rgba(72, 112, 236, 0.24);
        border-color: rgba(118, 156, 255, 0.38);
      }
      #${ROOT_ID} .vk-candidate-index {
        color: #8cb2ff;
        font-size: 12px;
        font-weight: 700;
      }
      #${ROOT_ID} .vk-candidate-comment {
        color: rgba(185, 200, 228, 0.7);
        font-size: 12px;
      }
      #${ROOT_ID} .vk-keyboard {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${ROOT_ID} .vk-row {
        justify-content: center;
      }
      #${ROOT_ID} .vk-key {
        min-width: 52px;
        min-height: 56px;
        padding: 0 10px;
        border-radius: 12px;
        background: rgba(243, 247, 255, 0.98);
        color: #12213e;
        font-size: 18px;
        font-weight: 600;
        box-shadow: 0 4px 8px rgba(5, 10, 20, 0.18), 0 1px 0 rgba(0,0,0,0.3);
      }
      #${ROOT_ID} .vk-key.is-muted {
        background: rgba(172, 190, 224, 0.72);
        color: #203459;
        font-size: 15px;
        box-shadow: 0 4px 8px rgba(5, 10, 20, 0.14), 0 1px 0 rgba(0,0,0,0.25);
      }
      #${ROOT_ID} .vk-key.is-accent {
        background: rgba(78, 128, 255, 0.96);
        color: #ffffff;
        box-shadow: 0 4px 8px rgba(40, 80, 200, 0.3), 0 1px 0 rgba(0,0,0,0.25);
      }
      #${ROOT_ID} .vk-key.is-wide {
        min-width: 80px;
      }
      #${ROOT_ID} .vk-key.is-grow {
        flex: 1;
      }
      @media (max-width: 640px) {
        #${ROOT_ID} {
          padding-left: 6px;
          padding-right: 6px;
        }
        #${ROOT_ID} .vk-key {
          min-width: 0;
          flex: 1;
          font-size: 16px;
          padding: 0 4px;
          min-height: 52px;
        }
        #${ROOT_ID} .vk-row {
          gap: 5px;
        }
      }
    `

    this.doc.head.appendChild(style)
  }

  private createRoot(): HTMLDivElement {
    const root = this.doc.createElement('div')
    root.id = ROOT_ID
    root.innerHTML = `
      <div class="vk-shell">
        <div class="vk-topbar">
          <div class="vk-mode-group" data-role="mode-group"></div>
          <span class="vk-status" data-role="status">虚拟键盘待命</span>
        </div>
        <div class="vk-composition is-idle" data-role="composition">点击输入框后开始输入</div>
        <div class="vk-candidates" data-role="candidates"></div>
        <div class="vk-keyboard" data-role="keyboard"></div>
      </div>
    `
    return root
  }

  private readonly handleKeyboardPointerDown = (event: PointerEvent): void => {
    event.preventDefault()
    this.cancelHide()
    this.focusActiveTarget()
  }

  private readonly handleRootClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const candidateIndex = target.closest<HTMLElement>('[data-candidate-index]')?.dataset['candidateIndex']
    if (candidateIndex) {
      void this.selectCandidate(Number(candidateIndex))
      return
    }

    const keyEl = target.closest<HTMLElement>('[data-key-id]')
    if (!keyEl) {
      return
    }

    const action = keyEl.dataset['action'] as KeyboardAction | undefined
    const value = keyEl.dataset['value']

    if (action) {
      void this.handleAction(action)
      return
    }

    if (value) {
      void this.handleKeyPress(value)
    }
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    if (!isEditableElement(event.target)) {
      this.scheduleActiveElementSync()
      return
    }

    this.activateTarget(event.target)
  }

  private readonly handleFocusOut = (event: FocusEvent): void => {
    if (!this.activeTarget || event.target !== this.activeTarget) {
      return
    }

    this.scheduleHide()
  }

  private readonly handleDocumentPointerDown = (event: PointerEvent): void => {
    if (this.eventPathIncludesRoot(event)) {
      return
    }

    if (isEditableElement(event.target)) {
      this.activateTarget(event.target)
      return
    }

    this.scheduleActiveElementSync()
    this.scheduleHide()
  }

  private activateTarget(target: HTMLInputElement | HTMLTextAreaElement): void {
    const nextMode = resolvePreferredKeyboardMode(target)

    if (this.activeTarget !== target) {
      this.resetComposition()
    }

    this.activeTarget = target
    this.mode = nextMode
    this.shifted = false
    this.show()
  }

  private getActiveEditableElement(): HTMLInputElement | HTMLTextAreaElement | null {
    const activeElement = this.doc.activeElement
    return isEditableElement(activeElement) ? activeElement : null
  }

  private scheduleActiveElementSync(): void {
    this.cancelActiveElementSync()
    this.activeElementSyncTimer = setTimeout(() => {
      const activeElement = this.getActiveEditableElement()
      if (activeElement) {
        this.activateTarget(activeElement)
      }
    }, 0)
  }

  private cancelActiveElementSync(): void {
    if (this.activeElementSyncTimer) {
      clearTimeout(this.activeElementSyncTimer)
      this.activeElementSyncTimer = null
    }
  }

  private startActiveElementPolling(): void {
    this.stopActiveElementPolling()
    this.activeElementPollTimer = setInterval(() => {
      const activeElement = this.getActiveEditableElement()

      if (activeElement) {
        if (this.activeTarget !== activeElement || !this.visible) {
          this.activateTarget(activeElement)
        }
        return
      }

      if (this.visible && !this.eventLoopTargetIsKeyboardInteraction()) {
        this.hide()
      }
    }, ACTIVE_ELEMENT_SYNC_INTERVAL_MS)
  }

  private stopActiveElementPolling(): void {
    if (this.activeElementPollTimer) {
      clearInterval(this.activeElementPollTimer)
      this.activeElementPollTimer = null
    }
  }

  private eventLoopTargetIsKeyboardInteraction(): boolean {
    const activeElement = this.doc.activeElement
    return !!activeElement && !!this.root && this.root.contains(activeElement)
  }

  private eventPathIncludesRoot(event: Event): boolean {
    if (!this.root) {
      return false
    }

    const eventWithPath = event as Event & { composedPath?: () => EventTarget[] }
    if (typeof eventWithPath.composedPath !== 'function') {
      return false
    }

    return eventWithPath.composedPath().includes(this.root)
  }

  private scheduleHide(): void {
    this.cancelHide()
    this.hideTimer = setTimeout(() => {
      if (!this.visible) {
        return
      }

      const activeElement = this.doc.activeElement
      if (activeElement && this.root?.contains(activeElement)) {
        return
      }

      this.hide()
    }, this.hideDelayMs)
  }

  private cancelHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }

  private focusActiveTarget(): void {
    if (!this.activeTarget) {
      return
    }

    this.activeTarget.focus({ preventScroll: true })
  }

  private async ensureImeReady(): Promise<void> {
    if (this.imeInitialized) {
      return
    }

    try {
      await this.api.imeSetSchema(this.defaultSchema)
      await this.api.imeSetPageSize(this.candidatePageSize)
      await this.api.imeSetOption('emoji_suggestion', this.showEmoji)
      await this.api.imeSetOption('simplification', this.simplified)
      this.imeInitialized = true
      this.renderStatus('中文输入已就绪')
    } catch {
      this.renderStatus('中文输入初始化失败')
    }
  }

  private async handleAction(action: KeyboardAction): Promise<void> {
    switch (action) {
      case 'shift':
        this.shifted = !this.shifted
        this.render()
        return
      case 'backspace':
        if (!this.activeTarget) {
          return
        }
        if (this.mode === 'zh' && this.composing) {
          await this.processImeKey('BackSpace')
          return
        }
        if (deleteBackwardAtSelection(this.activeTarget)) {
          this.dispatchInputEvent()
        }
        return
      case 'space':
        await this.handleKeyPress(' ')
        return
      case 'enter':
        if (!this.activeTarget) {
          return
        }
        if (this.mode === 'zh' && this.composing) {
          await this.processImeKey('Return')
          return
        }
        if (this.activeTarget instanceof HTMLTextAreaElement) {
          if (insertTextAtSelection(this.activeTarget, '\n')) {
            this.dispatchInputEvent()
          }
          return
        }
        this.hide(true)
        return
      case 'hide':
        this.hide(true)
        return
      case 'mode-zh':
        await this.switchMode('zh')
        return
      case 'mode-en':
        await this.switchMode('en')
        return
      case 'mode-num':
        await this.switchMode('num')
        return
    }
  }

  private async switchMode(nextMode: KeyboardMode): Promise<void> {
    if (this.mode === nextMode) {
      return
    }

    if (this.composing) {
      await this.clearImeComposition()
    }

    this.mode = nextMode
    this.shifted = false
    this.render()
  }

  private async handleKeyPress(rawKey: string): Promise<void> {
    if (!this.activeTarget) {
      return
    }

    if (this.mode === 'num') {
      if (insertTextAtSelection(this.activeTarget, rawKey)) {
        this.dispatchInputEvent()
      }
      return
    }

    const value = resolveKeyValue(this.mode, this.shifted, rawKey)

    if (this.mode === 'en') {
      if (insertTextAtSelection(this.activeTarget, value)) {
        this.dispatchInputEvent()
      }
      return
    }

    if (this.composing && /^[0-9]$/.test(value)) {
      const candidateIndex = value === '0' ? 9 : Number(value) - 1
      if (candidateIndex >= 0 && candidateIndex < this.currentCandidates.length) {
        await this.selectCandidate(candidateIndex)
        return
      }
    }

    if (/^[0-9]$/.test(value) && !this.composing) {
      if (insertTextAtSelection(this.activeTarget, value)) {
        this.dispatchInputEvent()
      }
      return
    }

    await this.processImeKey(value)
  }

  private async processImeKey(key: string): Promise<void> {
    if (!this.activeTarget) {
      return
    }

    await this.ensureImeReady()

    try {
      const result = await this.api.imeProcessInput(key)
      this.handleImeResult(result, key)
    } catch {
      if (isPrintableInput(key) && insertTextAtSelection(this.activeTarget, key)) {
        this.dispatchInputEvent()
      }
    }
  }

  private handleImeResult(result: RIME_RESULT, inputKey: string): void {
    if (!this.activeTarget) {
      return
    }

    switch (result.state) {
      case 0:
        if (result.committed && insertTextAtSelection(this.activeTarget, result.committed)) {
          this.dispatchInputEvent()
        }
        this.resetComposition()
        return
      case 1: {
        if (result.committed && insertTextAtSelection(this.activeTarget, result.committed)) {
          this.dispatchInputEvent()
        }
        const composition = resolveCompositionState(result)
        this.composing = true
        this.compositionText = composition?.text ?? ''
        this.currentCandidates = composition?.candidates ?? []
        this.render()
        return
      }
      case 2:
        this.resetComposition()
        return
      case 3:
        if (isPrintableInput(inputKey) && !this.composing) {
          if (insertTextAtSelection(this.activeTarget, inputKey)) {
            this.dispatchInputEvent()
          }
        } else if (applyUnhandledKeyToTarget(this.activeTarget, inputKey)) {
          this.dispatchInputEvent()
        } else {
          this.resetComposition()
        }
    }
  }

  private async selectCandidate(index: number): Promise<void> {
    if (!this.activeTarget) {
      return
    }

    try {
      const response = await this.api.imeSelectCandidate(index)
      const normalized = normalizeImePayload(response)

      if (normalized) {
        this.handleImeResult(normalized, '')
        return
      }

      if (response && insertTextAtSelection(this.activeTarget, response)) {
        this.dispatchInputEvent()
      }

      this.resetComposition()
    } catch {
      this.resetComposition()
    }
  }

  private async clearImeComposition(): Promise<void> {
    try {
      const result = await this.api.imeProcessInput('Escape')
      if (result.state === 0 && result.committed && this.activeTarget) {
        if (insertTextAtSelection(this.activeTarget, result.committed)) {
          this.dispatchInputEvent()
        }
      }
    } catch {
      // ignore best-effort cleanup
    }

    this.resetComposition()
  }

  private resetComposition(): void {
    this.composing = false
    this.compositionText = ''
    this.currentCandidates = []
    this.render()
  }

  private dispatchInputEvent(): void {
    if (!this.activeTarget) {
      return
    }

    this.activeTarget.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.focusActiveTarget()
  }

  private renderStatus(text: string): void {
    if (this.statusEl) {
      this.statusEl.textContent = text
    }
  }

  private render(): void {
    if (!this.ready) {
      return
    }

    this.renderModes()
    this.renderStatus(this.composing ? '候选可点击，空格选首项' : this.modeLabel())
    this.renderComposition()
    this.renderCandidates()
    this.renderKeyboard()
  }

  private modeLabel(): string {
    switch (this.mode) {
      case 'zh':
        return '中文拼音'
      case 'en':
        return this.shifted ? '英文大写' : '英文小写'
      case 'num':
        return '数字键盘'
    }
  }

  private renderModes(): void {
    const modeGroup = this.root?.querySelector<HTMLElement>('[data-role="mode-group"]')
    if (!modeGroup) {
      return
    }

    modeGroup.innerHTML = ['zh', 'en', 'num']
      .map((mode) => {
        const label = mode === 'zh' ? '中文' : mode === 'en' ? '英文' : '数字'
        const isActive = this.mode === mode
        return `
          <button
            type="button"
            class="vk-key ${isActive ? 'is-accent' : 'is-muted'}"
            data-key-id="mode-${mode}"
            data-action="mode-${mode}"
          >${label}</button>
        `
      })
      .join('')
  }

  private renderComposition(): void {
    if (!this.compositionEl) {
      return
    }

    this.compositionEl.textContent = this.compositionText || '点击输入框后开始输入'
    this.compositionEl.classList.toggle('is-idle', this.compositionText.length === 0)
  }

  private renderCandidates(): void {
    if (!this.candidatesEl) {
      return
    }

    if (!this.currentCandidates.length) {
      this.candidatesEl.innerHTML = ''
      return
    }

    this.candidatesEl.innerHTML = this.currentCandidates
      .map((candidate, index) => {
        const activeClass = index === 0 ? ' is-active' : ''
        const comment = candidate.comment
          ? `<span class="vk-candidate-comment">${this.escape(candidate.comment)}</span>`
          : ''
        return `
          <button
            type="button"
            class="vk-candidate${activeClass}"
            data-candidate-index="${index}"
          >
            <span class="vk-candidate-index">${candidateLabel(index)}</span>
            <span>${this.escape(candidate.text)}</span>
            ${comment}
          </button>
        `
      })
      .join('')
  }

  private renderKeyboard(): void {
    if (!this.keyboardEl) {
      return
    }

    const rows = buildKeyboardRows(this.mode, this.shifted)
    this.keyboardEl.innerHTML = rows
      .map((row) => {
        const content = row.map((key) => this.renderKey(key)).join('')
        return `<div class="vk-row">${content}</div>`
      })
      .join('')
  }

  private renderKey(key: KeyboardKey): string {
    const classes = ['vk-key']
    if (key.variant === 'muted') {
      classes.push('is-muted')
    }
    if (key.variant === 'accent') {
      classes.push('is-accent')
    }
    if (key.width === 'wide') {
      classes.push('is-wide')
    }
    if (key.width === 'grow') {
      classes.push('is-grow')
    }

    const dataValue = key.value ? ` data-value="${this.escape(key.value)}"` : ''
    const dataAction = key.action ? ` data-action="${key.action}"` : ''

    return `
      <button
        type="button"
        class="${classes.join(' ')}"
        data-key-id="${key.id}"${dataValue}${dataAction}
      >${this.escape(key.label)}</button>
    `
  }

  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
  }
}

export function installVirtualKeyboardPlugin(options: VirtualKeyboardOptions): VirtualKeyboardHandle {
  const controller = new VirtualKeyboardController(options)
  controller.start()

  return {
    show: () => controller.show(),
    hide: (force?: boolean) => controller.hide(force),
    destroy: () => controller.destroy(),
  }
}
