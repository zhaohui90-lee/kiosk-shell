/**
 * MainWindowController tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock BrowserWindow
const mockWebContents = {
  setWindowOpenHandler: vi.fn(),
  on: vi.fn(),
  openDevTools: vi.fn(),
  closeDevTools: vi.fn(),
  isDevToolsOpened: vi.fn(() => false),
  reload: vi.fn(),
  reloadIgnoringCache: vi.fn(),
  executeJavaScript: vi.fn(() => Promise.resolve()),
}

const mockWindow = {
  once: vi.fn(),
  on: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  focus: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  isAlwaysOnTop: vi.fn(() => false),
  loadURL: vi.fn(() => Promise.resolve()),
  loadFile: vi.fn(() => Promise.resolve()),
  setFullScreen: vi.fn(),
  isFullScreen: vi.fn(() => false),
  setKiosk: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  setSkipTaskbar: vi.fn(),
  webContents: mockWebContents,
}

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(() => mockWindow),
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      size: { width: 1920, height: 1080 },
    })),
  },
}))

vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }),
}))

import { MainWindowController } from '../window/controller/main-window-controller'
import { DevStrategy, KioskStrategy } from '../window/strategy/window-strategy'

describe('MainWindowController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWindow.isDestroyed.mockReturnValue(false)
    mockWindow.isAlwaysOnTop.mockReturnValue(false)
  })

  function createController(strategy = new DevStrategy(), config = {}) {
    return new MainWindowController(strategy, config)
  }

  describe('create', () => {
    it('should create a BrowserWindow', () => {
      const ctrl = createController()
      const win = ctrl.create()
      expect(win).toBeDefined()
    })

    it('should return existing window if already created', () => {
      const ctrl = createController()
      const win1 = ctrl.create()
      const win2 = ctrl.create()
      expect(win1).toBe(win2)
    })

    it('should setup window events', () => {
      const ctrl = createController()
      ctrl.create()
      expect(mockWindow.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function))
      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function))
    })

    it('should reset window reference on closed event', () => {
      const ctrl = createController()
      ctrl.create()
      expect(ctrl.getWindow()).toBeDefined()

      // Find and call the 'closed' handler
      const closedCall = mockWindow.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'closed'
      )
      expect(closedCall).toBeDefined()
      const closedHandler = closedCall![1] as () => void
      closedHandler()

      expect(ctrl.getWindow()).toBeNull()
      expect(ctrl.isValid()).toBe(false)
    })
  })

  describe('getWindow', () => {
    it('should return null before create', () => {
      const ctrl = createController()
      expect(ctrl.getWindow()).toBeNull()
    })

    it('should return window after create', () => {
      const ctrl = createController()
      ctrl.create()
      expect(ctrl.getWindow()).toBeDefined()
    })
  })

  describe('isValid', () => {
    it('should return false before create', () => {
      const ctrl = createController()
      expect(ctrl.isValid()).toBe(false)
    })

    it('should return true after create', () => {
      const ctrl = createController()
      ctrl.create()
      expect(ctrl.isValid()).toBe(true)
    })

    it('should return false if window is destroyed', () => {
      const ctrl = createController()
      ctrl.create()
      mockWindow.isDestroyed.mockReturnValue(true)
      expect(ctrl.isValid()).toBe(false)
    })
  })

  describe('loadURL', () => {
    it('should throw if window not created', async () => {
      const ctrl = createController()
      await expect(ctrl.loadURL('https://example.com')).rejects.toThrow(
        "Cannot perform 'loadURL'"
      )
    })

    it('should load URL into window', async () => {
      const ctrl = createController()
      ctrl.create()
      await ctrl.loadURL('https://example.com')
      expect(mockWindow.loadURL).toHaveBeenCalledWith('https://example.com')
    })
  })

  describe('loadFile', () => {
    it('should throw if window not created', async () => {
      const ctrl = createController()
      await expect(ctrl.loadFile('/path/to/file.html')).rejects.toThrow(
        "Cannot perform 'loadFile'"
      )
    })

    it('should load file into window', async () => {
      const ctrl = createController()
      ctrl.create()
      await ctrl.loadFile('/path/to/file.html')
      expect(mockWindow.loadFile).toHaveBeenCalledWith('/path/to/file.html')
    })
  })

  describe('fullscreen', () => {
    it('enterFullscreen should set fullscreen true', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.enterFullscreen()
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true)
    })

    it('exitFullscreen should set fullscreen false', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.exitFullscreen()
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false)
    })

    it('toggleFullscreen should toggle state', () => {
      const ctrl = createController()
      ctrl.create()
      mockWindow.isFullScreen.mockReturnValue(false)
      ctrl.toggleFullscreen()
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true)
    })

    it('should noop when window is invalid', () => {
      const ctrl = createController()
      ctrl.enterFullscreen()
      expect(mockWindow.setFullScreen).not.toHaveBeenCalled()
    })
  })

  describe('kiosk mode', () => {
    it('enterKioskMode should enable kiosk mode', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.enterKioskMode()
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(true)
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true)
      expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(true)
    })

    it('exitKioskMode should disable kiosk mode', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.exitKioskMode()
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(false)
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(false)
      expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(false)
    })

    it('isKioskMode should check alwaysOnTop', () => {
      const ctrl = createController()
      ctrl.create()
      mockWindow.isAlwaysOnTop.mockReturnValue(true)
      expect(ctrl.isKioskMode()).toBe(true)
    })

  })

  describe('DevTools', () => {
    it('openDevTools should open DevTools with DevStrategy', () => {
      const ctrl = createController(new DevStrategy())
      ctrl.create()
      ctrl.openDevTools()
      expect(mockWebContents.openDevTools).toHaveBeenCalled()
    })

    it('openDevTools should be blocked with KioskStrategy', () => {
      const ctrl = createController(new KioskStrategy())
      ctrl.create()
      ctrl.openDevTools()
      expect(mockWebContents.openDevTools).not.toHaveBeenCalled()
    })

    it('closeDevTools should close DevTools', () => {
      const ctrl = createController(new DevStrategy())
      ctrl.create()
      ctrl.closeDevTools()
      expect(mockWebContents.closeDevTools).toHaveBeenCalled()
    })

    it('toggleDevTools should toggle state', () => {
      const ctrl = createController(new DevStrategy())
      ctrl.create()
      mockWebContents.isDevToolsOpened.mockReturnValue(false)
      ctrl.toggleDevTools()
      expect(mockWebContents.openDevTools).toHaveBeenCalled()
    })

    it('toggleDevTools should be blocked with KioskStrategy', () => {
      const ctrl = createController(new KioskStrategy())
      ctrl.create()
      ctrl.toggleDevTools()
      expect(mockWebContents.openDevTools).not.toHaveBeenCalled()
      expect(mockWebContents.closeDevTools).not.toHaveBeenCalled()
    })
  })

  describe('reload', () => {
    it('reload should reload window', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.reload()
      expect(mockWebContents.reload).toHaveBeenCalled()
    })

    it('forceReload should reload ignoring cache', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.forceReload()
      expect(mockWebContents.reloadIgnoringCache).toHaveBeenCalled()
    })
  })

  describe('close and destroy', () => {
    it('close should close window', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.close()
      expect(mockWindow.close).toHaveBeenCalled()
    })

    it('destroy should destroy window', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.destroy()
      expect(mockWindow.destroy).toHaveBeenCalled()
      expect(ctrl.getWindow()).toBeNull()
    })

    it('destroy should be safe when no window exists', () => {
      const ctrl = createController()
      ctrl.destroy() // should not throw
    })
  })

  describe('focus', () => {
    it('should focus window', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.focus()
      expect(mockWindow.focus).toHaveBeenCalled()
    })

    it('should noop when window is invalid', () => {
      const ctrl = createController()
      ctrl.focus()
      expect(mockWindow.focus).not.toHaveBeenCalled()
    })
  })

  describe('visibility', () => {
    it('show should display and focus window', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.show()
      expect(mockWindow.show).toHaveBeenCalled()
      expect(mockWindow.focus).toHaveBeenCalled()
    })

    it('hide should hide window', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.hide()
      expect(mockWindow.hide).toHaveBeenCalled()
    })
  })

  describe('interaction mask', () => {
    it('showInteractionMask should inject blocking overlay script', () => {
      const ctrl = createController()
      ctrl.create()

      ctrl.showInteractionMask()

      expect(mockWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('__kiosk_shell_main_window_mask__')
      )
    })

    it('hideInteractionMask should inject removal script', () => {
      const ctrl = createController()
      ctrl.create()

      ctrl.hideInteractionMask()

      expect(mockWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining("mask.remove()")
      )
    })

    it('should reapply interaction mask after page reload when enabled', () => {
      const ctrl = createController()
      ctrl.create()
      ctrl.showInteractionMask()

      const finishLoadCall = mockWebContents.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'did-finish-load'
      )

      expect(finishLoadCall).toBeDefined()
      const finishLoadHandler = finishLoadCall![1] as () => void

      mockWebContents.executeJavaScript.mockClear()
      mockWindow.isDestroyed.mockReturnValue(false)
      finishLoadHandler()

      expect(mockWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('__kiosk_shell_main_window_mask__')
      )
    })
  })
})
