/**
 * WindowManager integration tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserWindow } from 'electron'

// ---- Main window mock ----

const mockMainWebContents = {
  setWindowOpenHandler: vi.fn(),
  on: vi.fn(),
  openDevTools: vi.fn(),
  closeDevTools: vi.fn(),
  isDevToolsOpened: vi.fn(() => false),
  reload: vi.fn(),
  reloadIgnoringCache: vi.fn(),
  executeJavaScript: vi.fn(() => Promise.resolve()),
}

const mockMainWindow = {
  once: vi.fn(),
  on: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  moveTop: vi.fn(),
  focus: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  isVisible: vi.fn(() => false),
  isAlwaysOnTop: vi.fn(() => false),
  setVisibleOnAllWorkspaces: vi.fn(),
  loadURL: vi.fn(() => Promise.resolve()),
  loadFile: vi.fn(() => Promise.resolve()),
  removeAllListeners: vi.fn(),
  setFullScreen: vi.fn(),
  isFullScreen: vi.fn(() => false),
  setKiosk: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  setSkipTaskbar: vi.fn(),
  webContents: mockMainWebContents,
}

// ---- Admin window mock ----

const mockAdminWebContents = {
  setWindowOpenHandler: vi.fn(),
  on: vi.fn(),
  openDevTools: vi.fn(),
  closeDevTools: vi.fn(),
  isDevToolsOpened: vi.fn(() => false),
}

const mockAdminWindow = {
  once: vi.fn(),
  on: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  moveTop: vi.fn(),
  focus: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  isVisible: vi.fn(() => false),
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
  loadFile: vi.fn(() => Promise.resolve()),
  removeAllListeners: vi.fn(),
  webContents: mockAdminWebContents,
}

// Admin window is distinguished by fullscreenable: false in its options
vi.mock('electron', () => ({
  app: { isPackaged: false },
  BrowserWindow: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    return options?.fullscreenable === false ? mockAdminWindow : mockMainWindow
  }),
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

vi.mock('@kiosk/device', () => ({
  loadConfig: vi.fn(() => ({
    width: 480,
    height: 768,
  })),
}))

import { createWindowManager, resetWindowManager, getWindowManager, WindowManager } from '../window'

describe('WindowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMainWindow.isDestroyed.mockReturnValue(false)
    mockMainWindow.isVisible.mockReturnValue(false)
    mockMainWindow.isAlwaysOnTop.mockReturnValue(false)
    mockAdminWindow.isDestroyed.mockReturnValue(false)
    mockAdminWindow.isVisible.mockReturnValue(false)
    resetWindowManager()
  })

  describe('constructor', () => {
    it('should create instance', () => {
      const manager = createWindowManager()
      expect(manager).toBeInstanceOf(WindowManager)
    })
  })

  describe('main window delegation', () => {
    it('createWindow should create and return BrowserWindow', () => {
      const manager = createWindowManager()
      const win = manager.createWindow()
      expect(win).toBeDefined()
    })

    it('getWindow should return null before create', () => {
      const manager = createWindowManager()
      expect(manager.getWindow()).toBeNull()
    })

    it('getWindow should return window after create', () => {
      const manager = createWindowManager()
      manager.createWindow()
      expect(manager.getWindow()).toBeDefined()
    })

    it('isValid should track window state', () => {
      const manager = createWindowManager()
      expect(manager.isValid()).toBe(false)
      manager.createWindow()
      expect(manager.isValid()).toBe(true)
    })

    it('loadURL should delegate', async () => {
      const manager = createWindowManager()
      manager.createWindow()
      await manager.loadURL('https://example.com')
      expect(mockMainWindow.loadURL).toHaveBeenCalledWith('https://example.com')
    })

    it('loadFile should delegate', async () => {
      const manager = createWindowManager()
      manager.createWindow()
      await manager.loadFile('/path/to/file.html')
      expect(mockMainWindow.loadFile).toHaveBeenCalledWith('/path/to/file.html')
    })

    it('enterFullscreen should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.enterFullscreen()
      expect(mockMainWindow.setFullScreen).toHaveBeenCalledWith(true)
    })

    it('exitFullscreen should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.exitFullscreen()
      expect(mockMainWindow.setFullScreen).toHaveBeenCalledWith(false)
    })

    it('toggleFullscreen should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.toggleFullscreen()
      expect(mockMainWindow.setFullScreen).toHaveBeenCalled()
    })

    it('enterKioskMode should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.enterKioskMode()
      expect(mockMainWindow.setKiosk).toHaveBeenCalledWith(true)
    })

    it('exitKioskMode should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.exitKioskMode()
      expect(mockMainWindow.setKiosk).toHaveBeenCalledWith(false)
    })

    it('reload should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.reload()
      expect(mockMainWebContents.reload).toHaveBeenCalled()
    })

    it('forceReload should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.forceReload()
      expect(mockMainWebContents.reloadIgnoringCache).toHaveBeenCalled()
    })

    it('focus should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.focus()
      expect(mockMainWindow.focus).toHaveBeenCalled()
    })

    it('openDevTools should still work for packaged app when config enables devTools', async () => {
      const { app } = await import('electron')
      Object.defineProperty(app, 'isPackaged', { value: true, configurable: true })

      const manager = createWindowManager({ devTools: true })
      manager.createWindow()
      manager.openDevTools()

      expect(mockMainWebContents.openDevTools).toHaveBeenCalled()

      Object.defineProperty(app, 'isPackaged', { value: false, configurable: true })
    })
  })

  describe('admin window delegation', () => {
    it('createAdminWindow should create admin window', () => {
      const manager = createWindowManager()
      const win = manager.createAdminWindow({})
      expect(win).toBeDefined()
    })

    it('createAdminWindow should use main window as parent when available', () => {
      const manager = createWindowManager()
      manager.createWindow()

      manager.createAdminWindow({})

      const browserWindowMock = vi.mocked(BrowserWindow)
      expect(browserWindowMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          parent: mockMainWindow,
        })
      )
    })

    it('getAdminWindow should return null before create', () => {
      const manager = createWindowManager()
      expect(manager.getAdminWindow()).toBeNull()
    })

    it('isAdminWindowValid should track state', () => {
      const manager = createWindowManager()
      expect(manager.isAdminWindowValid()).toBe(false)
      manager.createAdminWindow({})
      expect(manager.isAdminWindowValid()).toBe(true)
    })

    it('showAdminWindow should show', () => {
      const manager = createWindowManager()
      manager.createAdminWindow({})
      manager.showAdminWindow(false)
      expect(mockAdminWindow.show).toHaveBeenCalled()
    })

    it('showAdminWindow should raise admin without hiding main window in kiosk mode', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})
      vi.clearAllMocks()
      mockMainWindow.isDestroyed.mockReturnValue(false)
      mockAdminWindow.isDestroyed.mockReturnValue(false)

      manager.showAdminWindow(false)

      // Admin is shown and brought to top
      expect(mockAdminWindow.show).toHaveBeenCalledTimes(1)
      expect(mockAdminWindow.moveTop).toHaveBeenCalledTimes(1)
      // Main window stays visible — never hidden
      expect(mockMainWindow.hide).not.toHaveBeenCalled()
      // Admin overlay level is raised above kiosk window
      expect(mockAdminWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver')
      expect(mockAdminWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
        visibleOnFullScreen: true,
      })
      // Main window interaction is blocked via mask
      expect(mockMainWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('__kiosk_shell_main_window_mask__')
      )
    })

    it('hideAdminWindow should hide', () => {
      const manager = createWindowManager()
      manager.createAdminWindow({})
      manager.hideAdminWindow()
      expect(mockAdminWindow.hide).toHaveBeenCalled()
    })

    it('hideAdminWindow should focus main window after hiding admin', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})
      manager.showAdminWindow(false)
      vi.clearAllMocks()
      mockMainWindow.isDestroyed.mockReturnValue(false)
      mockAdminWindow.isDestroyed.mockReturnValue(false)

      manager.hideAdminWindow()

      expect(mockAdminWindow.hide).toHaveBeenCalledTimes(1)
      expect(mockMainWindow.focus).toHaveBeenCalledTimes(1)
      expect(mockMainWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('mask.remove()')
      )
    })

    it('toggleAdminWindow should toggle', () => {
      const manager = createWindowManager()
      manager.createAdminWindow({})
      mockAdminWindow.isVisible.mockReturnValue(false)
      manager.toggleAdminWindow(false)
      expect(mockAdminWindow.show).toHaveBeenCalled()
    })

    it('toggleAdminWindow should focus main window when hiding admin', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})
      manager.showAdminWindow(false)
      mockAdminWindow.isVisible.mockReturnValue(true)

      vi.clearAllMocks()
      mockMainWindow.isDestroyed.mockReturnValue(false)
      mockAdminWindow.isDestroyed.mockReturnValue(false)

      manager.toggleAdminWindow(false)

      expect(mockAdminWindow.hide).toHaveBeenCalledTimes(1)
      expect(mockMainWindow.focus).toHaveBeenCalledTimes(1)
      expect(mockMainWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('mask.remove()')
      )
    })

    it('closing admin window should focus main window after close intercept', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})

      const closeCall = mockAdminWindow.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'close'
      )
      expect(closeCall).toBeDefined()
      const closeHandler = closeCall![1] as (event: { preventDefault: () => void }) => void

      manager.showAdminWindow(false)
      vi.clearAllMocks()
      mockMainWindow.isDestroyed.mockReturnValue(false)
      mockAdminWindow.isDestroyed.mockReturnValue(false)

      const mockEvent = { preventDefault: vi.fn() }
      closeHandler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockAdminWindow.hide).toHaveBeenCalledTimes(1)
      expect(mockMainWindow.focus).toHaveBeenCalledTimes(1)
      expect(mockMainWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('mask.remove()')
      )
    })

    it('destroyAdminWindow should only destroy admin window', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})
      manager.showAdminWindow(false)
      vi.clearAllMocks()
      mockMainWindow.isDestroyed.mockReturnValue(false)
      mockAdminWindow.isDestroyed.mockReturnValue(false)

      manager.destroyAdminWindow()

      // Admin destroyed
      expect(manager.isAdminWindowValid()).toBe(false)
      // Main still valid
      expect(manager.isValid()).toBe(true)
      expect(mockMainWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('mask.remove()')
      )
    })
  })

  describe('destroy', () => {
    it('should destroy both windows', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})
      vi.clearAllMocks()
      mockMainWindow.isDestroyed.mockReturnValue(false)
      mockAdminWindow.isDestroyed.mockReturnValue(false)

      manager.destroy()

      expect(mockMainWindow.destroy).toHaveBeenCalled()
      expect(mockAdminWindow.destroy).toHaveBeenCalled()
    })
  })

  describe('singleton', () => {
    it('getWindowManager should return same instance', () => {
      const m1 = getWindowManager()
      const m2 = getWindowManager()
      expect(m1).toBe(m2)
    })

    it('resetWindowManager should clear singleton', () => {
      const m1 = getWindowManager()
      resetWindowManager()
      const m2 = getWindowManager()
      expect(m1).not.toBe(m2)
    })

    it('createWindowManager should return new instance each time', () => {
      const m1 = createWindowManager()
      const m2 = createWindowManager()
      expect(m1).not.toBe(m2)
    })
  })
})
