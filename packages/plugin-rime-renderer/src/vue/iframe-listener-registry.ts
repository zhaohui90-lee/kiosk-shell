type Listener = EventListenerOrEventListenerObject

export type IframeQueryRoot = {
  querySelectorAll(selectors: string): ArrayLike<unknown>
}

export type IframeDocumentLike = IframeQueryRoot & {
  addEventListener(type: string, listener: Listener, options?: boolean): void
  removeEventListener(type: string, listener: Listener, options?: boolean): void
}

export type IframeLike = {
  tagName?: string
  contentDocument: IframeDocumentLike | null
  addEventListener(type: string, listener: Listener, options?: boolean): void
  removeEventListener(type: string, listener: Listener, options?: boolean): void
}

export type IframeMutationRecord = {
  addedNodes: ArrayLike<unknown>
  removedNodes: ArrayLike<unknown>
}

export type IframeObserverLike = {
  observe(target: unknown, options: MutationObserverInit): void
  disconnect(): void
}

type CreateIframeObserver = (
  callback: (mutations: IframeMutationRecord[]) => void,
) => IframeObserverLike

type IframeListenerRegistryOptions = {
  focusInHandler: Listener
  focusOutHandler: Listener
  pointerDownHandler: Listener
  createObserver: CreateIframeObserver
}

export type IframeListenerRegistry = {
  attach: (iframe: IframeLike) => void
  detach: (iframe: IframeLike) => void
  scan: (root: IframeQueryRoot) => void
  startObserving: (target: unknown) => void
  stop: () => void
}

function hasQuerySelectorAll(value: unknown): value is IframeQueryRoot {
  return typeof value === 'object' && value !== null && typeof (value as IframeQueryRoot).querySelectorAll === 'function'
}

function isIframeLike(value: unknown): value is IframeLike {
  if (typeof value !== 'object' || value === null) return false
  const iframe = value as IframeLike
  return typeof iframe.tagName === 'string'
    && iframe.tagName.toUpperCase() === 'IFRAME'
    && typeof iframe.addEventListener === 'function'
    && typeof iframe.removeEventListener === 'function'
}

function safeContentDocument(iframe: IframeLike): IframeDocumentLike | null {
  try {
    return iframe.contentDocument
  } catch {
    return null
  }
}

export function createIframeListenerRegistry({
  focusInHandler,
  focusOutHandler,
  pointerDownHandler,
  createObserver,
}: IframeListenerRegistryOptions): IframeListenerRegistry {
  const attachedDocuments = new Map<IframeLike, IframeDocumentLike>()
  const loadHandlers = new Map<IframeLike, Listener>()
  let observer: IframeObserverLike | null = null

  function addDocumentListeners(doc: IframeDocumentLike): void {
    doc.addEventListener('focusin', focusInHandler, true)
    doc.addEventListener('focusout', focusOutHandler, true)
    doc.addEventListener('pointerdown', pointerDownHandler, true)
  }

  function removeDocumentListeners(doc: IframeDocumentLike): void {
    doc.removeEventListener('focusin', focusInHandler, true)
    doc.removeEventListener('focusout', focusOutHandler, true)
    doc.removeEventListener('pointerdown', pointerDownHandler, true)
  }

  function ensureLoadHandler(iframe: IframeLike): void {
    if (loadHandlers.has(iframe)) return
    const loadHandler: EventListener = () => {
      attach(iframe)
    }
    iframe.addEventListener('load', loadHandler)
    loadHandlers.set(iframe, loadHandler)
  }

  function attach(iframe: IframeLike): void {
    ensureLoadHandler(iframe)
    const previousDoc = attachedDocuments.get(iframe)
    const nextDoc = safeContentDocument(iframe)

    if (previousDoc && previousDoc !== nextDoc) {
      removeDocumentListeners(previousDoc)
      attachedDocuments.delete(iframe)
    }

    if (!nextDoc || previousDoc === nextDoc) return

    addDocumentListeners(nextDoc)
    attachedDocuments.set(iframe, nextDoc)
  }

  function detach(iframe: IframeLike): void {
    const attachedDoc = attachedDocuments.get(iframe)
    if (attachedDoc) {
      removeDocumentListeners(attachedDoc)
      attachedDocuments.delete(iframe)
    }

    const loadHandler = loadHandlers.get(iframe)
    if (!loadHandler) return

    iframe.removeEventListener('load', loadHandler)
    loadHandlers.delete(iframe)
  }

  function scan(root: IframeQueryRoot): void {
    for (const candidate of Array.from(root.querySelectorAll('iframe'))) {
      if (isIframeLike(candidate)) attach(candidate)
    }
  }

  function processMutations(mutations: IframeMutationRecord[]): void {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (isIframeLike(node)) {
          attach(node)
          continue
        }
        if (hasQuerySelectorAll(node)) scan(node)
      }

      for (const node of Array.from(mutation.removedNodes)) {
        if (isIframeLike(node)) {
          detach(node)
          continue
        }
        if (!hasQuerySelectorAll(node)) continue
        for (const candidate of Array.from(node.querySelectorAll('iframe'))) {
          if (isIframeLike(candidate)) detach(candidate)
        }
      }
    }
  }

  function startObserving(target: unknown): void {
    if (observer) return
    observer = createObserver(processMutations)
    observer.observe(target, { childList: true, subtree: true })
  }

  function stop(): void {
    observer?.disconnect()
    observer = null

    for (const doc of attachedDocuments.values()) {
      removeDocumentListeners(doc)
    }
    attachedDocuments.clear()

    for (const [iframe, loadHandler] of loadHandlers) {
      iframe.removeEventListener('load', loadHandler)
    }
    loadHandlers.clear()
  }

  return {
    attach,
    detach,
    scan,
    startObserving,
    stop,
  }
}
