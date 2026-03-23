/**
 * Admin trigger click zone unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Admin Trigger Click Zone', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should export CLICK_ZONE_CONFIG with correct defaults', async () => {
    vi.doMock('@kiosk/plugin-rime-renderer', () => ({
      installVirtualKeyboardPlugin: vi.fn(),
    }))
    vi.doMock('electron', () => ({
      contextBridge: undefined,
      ipcRenderer: { invoke: vi.fn(), send: vi.fn() },
    }))

    const { CLICK_ZONE_CONFIG } = await import('../preload')

    expect(CLICK_ZONE_CONFIG).toBeDefined()
    expect(CLICK_ZONE_CONFIG.size).toBe(50)
    expect(CLICK_ZONE_CONFIG.clickThreshold).toBe(5)
    expect(CLICK_ZONE_CONFIG.timeWindowMs).toBe(2000)
  })

  it('should inject click zone into DOM on DOMContentLoaded', async () => {
    const mockSend = vi.fn()
    const mockAppendChild = vi.fn()
    const mockAddEventListener = vi.fn()

    // Mock document
    const originalDocument = globalThis.document
    const mockElement = {
      id: '',
      style: { cssText: '' },
      addEventListener: vi.fn(),
    }

    Object.defineProperty(globalThis, 'document', {
      value: {
        addEventListener: mockAddEventListener,
        createElement: vi.fn(() => mockElement),
        body: { appendChild: mockAppendChild },
      },
      writable: true,
      configurable: true,
    })

    vi.doMock('@kiosk/plugin-rime-renderer', () => ({
      installVirtualKeyboardPlugin: vi.fn(),
    }))
    vi.doMock('electron', () => ({
      contextBridge: {
        exposeInMainWorld: vi.fn(),
      },
      ipcRenderer: {
        invoke: vi.fn(),
        send: mockSend,
      },
    }))

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await import('../preload')

    // DOMContentLoaded listener should be registered
    expect(mockAddEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function))

    // Simulate DOMContentLoaded
    const domReadyCallback = mockAddEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'DOMContentLoaded'
    )
    expect(domReadyCallback).toBeDefined()
    const handler = domReadyCallback![1] as () => void
    handler()

    // Click zone should be appended to body
    expect(mockAppendChild).toHaveBeenCalledWith(mockElement)
    expect(mockElement.id).toBe('__kiosk_admin_trigger')
    expect(consoleSpy).toHaveBeenCalledWith('[Preload] Admin trigger click zone injected')

    consoleSpy.mockRestore()
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    })
  })

  it('should trigger admin panel after 5 consecutive clicks within 2 seconds', async () => {
    const mockSend = vi.fn()
    const mockClickHandler = vi.fn()
    const mockAddEventListener = vi.fn()

    const mockElement = {
      id: '',
      style: { cssText: '' },
      addEventListener: (event: string, handler: () => void) => {
        if (event === 'click') mockClickHandler.mockImplementation(handler)
      },
    }

    const originalDocument = globalThis.document
    Object.defineProperty(globalThis, 'document', {
      value: {
        addEventListener: mockAddEventListener,
        createElement: vi.fn(() => mockElement),
        body: { appendChild: vi.fn() },
      },
      writable: true,
      configurable: true,
    })

    vi.doMock('@kiosk/plugin-rime-renderer', () => ({
      installVirtualKeyboardPlugin: vi.fn(),
    }))
    vi.doMock('electron', () => ({
      contextBridge: {
        exposeInMainWorld: vi.fn(),
      },
      ipcRenderer: {
        invoke: vi.fn(),
        send: mockSend,
      },
    }))

    vi.spyOn(console, 'log').mockImplementation(() => {})

    await import('../preload')

    // Simulate DOMContentLoaded
    const domReadyCallback = mockAddEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'DOMContentLoaded'
    )
    ;(domReadyCallback![1] as () => void)()

    // Simulate 4 clicks - should NOT trigger
    for (let i = 0; i < 4; i++) {
      mockClickHandler()
    }
    expect(mockSend).not.toHaveBeenCalled()

    // 5th click - should trigger
    mockClickHandler()
    expect(mockSend).toHaveBeenCalledWith('shell:adminTrigger')

    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    })
  })
})
