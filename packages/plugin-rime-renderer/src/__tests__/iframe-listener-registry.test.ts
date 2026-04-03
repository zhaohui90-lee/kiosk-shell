import { describe, expect, it } from 'vitest'
import {
  createIframeListenerRegistry,
  type IframeDocumentLike,
  type IframeLike,
  type IframeMutationRecord,
  type IframeObserverLike,
  type IframeQueryRoot,
} from '../vue/iframe-listener-registry'

type RecordedListener = {
  type: string
  listener: EventListenerOrEventListenerObject
  options?: boolean
}

type FakeEventTarget = {
  adds: RecordedListener[]
  removes: RecordedListener[]
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean) => void
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean) => void
  activeCount: (type: string) => number
  addCount: (type: string) => number
  removeCount: (type: string) => number
  emit: (type: string) => void
}

type FakeDocument = IframeDocumentLike & FakeEventTarget & {
  name: string
  iframes: IframeLike[]
}

type FakeIframe = IframeLike & FakeEventTarget & {
  name: string
}

class FakeMutationObserver implements IframeObserverLike {
  public disconnected = false
  public observeCalls: Array<{ target: unknown; options: MutationObserverInit }> = []

  public constructor(
    private readonly callback: (mutations: IframeMutationRecord[]) => void,
  ) {}

  public observe(target: unknown, options: MutationObserverInit): void {
    this.observeCalls.push({ target, options })
  }

  public disconnect(): void {
    this.disconnected = true
  }

  public flush(...mutations: IframeMutationRecord[]): void {
    this.callback(mutations)
  }
}

function createEventTarget(): FakeEventTarget {
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
  const adds: RecordedListener[] = []
  const removes: RecordedListener[] = []

  return {
    adds,
    removes,
    addEventListener(type, listener, options) {
      adds.push({ type, listener, options })
      const bucket = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
      bucket.add(listener)
      listeners.set(type, bucket)
    },
    removeEventListener(type, listener, options) {
      removes.push({ type, listener, options })
      listeners.get(type)?.delete(listener)
    },
    activeCount(type) {
      return listeners.get(type)?.size ?? 0
    },
    addCount(type) {
      return adds.filter((entry) => entry.type === type).length
    },
    removeCount(type) {
      return removes.filter((entry) => entry.type === type).length
    },
    emit(type) {
      for (const listener of listeners.get(type) ?? []) {
        if (typeof listener === 'function') {
          listener({ type } as Event)
          continue
        }
        listener.handleEvent({ type } as Event)
      }
    },
  }
}

function createFakeDocument(name: string, iframes: IframeLike[] = []): FakeDocument {
  const target = createEventTarget()
  return {
    name,
    iframes,
    ...target,
    querySelectorAll(selectors: string): ArrayLike<unknown> {
      return selectors === 'iframe' ? this.iframes : []
    },
  }
}

function createFakeIframe(name: string, contentDocument: IframeDocumentLike | null): FakeIframe {
  return {
    name,
    tagName: 'IFRAME',
    contentDocument,
    ...createEventTarget(),
  }
}

function createFakeRoot(iframes: IframeLike[]): IframeQueryRoot {
  return {
    querySelectorAll(selectors: string): ArrayLike<unknown> {
      return selectors === 'iframe' ? iframes : []
    },
  }
}

function createRegistry(observerRef: { current: FakeMutationObserver | null }) {
  const focusInHandler: EventListener = () => undefined
  const focusOutHandler: EventListener = () => undefined
  const pointerDownHandler: EventListener = () => undefined

  return createIframeListenerRegistry({
    focusInHandler,
    focusOutHandler,
    pointerDownHandler,
    createObserver: (callback) => {
      observerRef.current = new FakeMutationObserver(callback)
      return observerRef.current
    },
  })
}

describe('iframe-listener-registry', () => {
  it('adds document listeners once and keeps a single load listener across repeated scans', () => {
    const observerRef = { current: null as FakeMutationObserver | null }
    const registry = createRegistry(observerRef)
    const frameDoc = createFakeDocument('frame-doc')
    const iframe = createFakeIframe('frame', frameDoc)

    registry.scan(createFakeRoot([iframe]))
    registry.scan(createFakeRoot([iframe]))

    expect(frameDoc.addCount('focusin')).toBe(1)
    expect(frameDoc.addCount('focusout')).toBe(1)
    expect(frameDoc.addCount('pointerdown')).toBe(1)
    expect(iframe.addCount('load')).toBe(1)
    expect(iframe.activeCount('load')).toBe(1)
  })

  it('rebinds listeners to the latest iframe document when navigation triggers load', () => {
    const observerRef = { current: null as FakeMutationObserver | null }
    const registry = createRegistry(observerRef)
    const firstDoc = createFakeDocument('doc-a')
    const secondDoc = createFakeDocument('doc-b')
    const iframe = createFakeIframe('frame', firstDoc)

    registry.attach(iframe)
    iframe.contentDocument = secondDoc
    iframe.emit('load')

    expect(firstDoc.removeCount('focusin')).toBe(1)
    expect(firstDoc.removeCount('focusout')).toBe(1)
    expect(firstDoc.removeCount('pointerdown')).toBe(1)
    expect(secondDoc.addCount('focusin')).toBe(1)
    expect(secondDoc.addCount('focusout')).toBe(1)
    expect(secondDoc.addCount('pointerdown')).toBe(1)
    expect(iframe.addCount('load')).toBe(1)
  })

  it('tracks iframe additions and removals from the observer subtree', () => {
    const observerRef = { current: null as FakeMutationObserver | null }
    const registry = createRegistry(observerRef)
    const frameDoc = createFakeDocument('frame-doc')
    const iframe = createFakeIframe('frame', frameDoc)
    const subtree = createFakeDocument('subtree-root', [iframe])

    registry.startObserving({ id: 'root' })
    observerRef.current?.flush(
      { addedNodes: [subtree], removedNodes: [] },
      { addedNodes: [], removedNodes: [subtree] },
    )

    expect(frameDoc.addCount('focusin')).toBe(1)
    expect(frameDoc.removeCount('focusin')).toBe(1)
    expect(iframe.addCount('load')).toBe(1)
    expect(iframe.removeCount('load')).toBe(1)
    expect(observerRef.current?.observeCalls).toEqual([
      {
        target: { id: 'root' },
        options: { childList: true, subtree: true },
      },
    ])
  })

  it('stops observation and cleans up every tracked iframe', () => {
    const observerRef = { current: null as FakeMutationObserver | null }
    const registry = createRegistry(observerRef)
    const firstDoc = createFakeDocument('doc-a')
    const secondDoc = createFakeDocument('doc-b')
    const firstIframe = createFakeIframe('frame-a', firstDoc)
    const secondIframe = createFakeIframe('frame-b', secondDoc)

    registry.scan(createFakeRoot([firstIframe, secondIframe]))
    registry.startObserving({ id: 'root' })
    registry.stop()

    expect(firstDoc.removeCount('focusin')).toBe(1)
    expect(firstDoc.removeCount('focusout')).toBe(1)
    expect(firstDoc.removeCount('pointerdown')).toBe(1)
    expect(secondDoc.removeCount('focusin')).toBe(1)
    expect(secondDoc.removeCount('focusout')).toBe(1)
    expect(secondDoc.removeCount('pointerdown')).toBe(1)
    expect(firstIframe.removeCount('load')).toBe(1)
    expect(secondIframe.removeCount('load')).toBe(1)
    expect(observerRef.current?.disconnected).toBe(true)
  })
})
