/**
 * WindowManager integration tests
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
  isVisible: vi.fn(() => false),
  isAlwaysOnTop: vi.fn(() => false),
  loadURL: vi.fn(() => Promise.resolve()),
  loadFile: vi.fn(() => Promise.resolve()),
  removeAllListeners: vi.fn(),
  setFullScreen: vi.fn(),
  isFullScreen: vi.fn(() => false),
  setKiosk: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  setSkipTaskbar: vi.fn(),
  webContents: mockWebContents,
}

vi.mock('electron', () => ({
  app: { isPackaged: false },
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
    mockWindow.isDestroyed.mockReturnValue(false)
    mockWindow.isVisible.mockReturnValue(false)
    mockWindow.isAlwaysOnTop.mockReturnValue(false)
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
      expect(mockWindow.loadURL).toHaveBeenCalledWith('https://example.com')
    })

    it('loadFile should delegate', async () => {
      const manager = createWindowManager()
      manager.createWindow()
      await manager.loadFile('/path/to/file.html')
      expect(mockWindow.loadFile).toHaveBeenCalledWith('/path/to/file.html')
    })

    it('enterFullscreen should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.enterFullscreen()
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true)
    })

    it('exitFullscreen should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.exitFullscreen()
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false)
    })

    it('toggleFullscreen should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.toggleFullscreen()
      expect(mockWindow.setFullScreen).toHaveBeenCalled()
    })

    it('enterKioskMode should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.enterKioskMode()
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(true)
    })

    it('exitKioskMode should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.exitKioskMode()
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(false)
    })

    it('reload should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.reload()
      expect(mockWebContents.reload).toHaveBeenCalled()
    })

    it('forceReload should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.forceReload()
      expect(mockWebContents.reloadIgnoringCache).toHaveBeenCalled()
    })

    it('focus should delegate', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.focus()
      expect(mockWindow.focus).toHaveBeenCalled()
    })

    it('openDevTools should still work for packaged app when config enables devTools', async () => {
      const { app } = await import('electron')
      Object.defineProperty(app, 'isPackaged', { value: true, configurable: true })

      const manager = createWindowManager({ devTools: true })
      manager.createWindow()
      manager.openDevTools()

      expect(mockWebContents.openDevTools).toHaveBeenCalled()

      Object.defineProperty(app, 'isPackaged', { value: false, configurable: true })
    })
  })

  describe('admin window delegation', () => {
    it('createAdminWindow should create admin window', () => {
      const manager = createWindowManager()
      const win = manager.createAdminWindow({})
      expect(win).toBeDefined()
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
      expect(mockWindow.show).toHaveBeenCalled()
    })

    it('hideAdminWindow should hide', () => {
      const manager = createWindowManager()
      manager.createAdminWindow({})
      manager.hideAdminWindow()
      expect(mockWindow.hide).toHaveBeenCalled()
    })

    it('toggleAdminWindow should toggle', () => {
      const manager = createWindowManager()
      manager.createAdminWindow({})
      mockWindow.isVisible.mockReturnValue(false)
      manager.toggleAdminWindow(false)
      expect(mockWindow.show).toHaveBeenCalled()
    })

    it('destroyAdminWindow should only destroy admin window', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})
      vi.clearAllMocks()
      mockWindow.isDestroyed.mockReturnValue(false)

      manager.destroyAdminWindow()

      // Admin destroyed
      expect(manager.isAdminWindowValid()).toBe(false)
      // Main still valid
      expect(manager.isValid()).toBe(true)
    })
  })

  describe('destroy', () => {
    it('should destroy both windows', () => {
      const manager = createWindowManager()
      manager.createWindow()
      manager.createAdminWindow({})
      vi.clearAllMocks()
      mockWindow.isDestroyed.mockReturnValue(false)

      manager.destroy()
      // destroy is called for both main and admin
      expect(mockWindow.destroy).toHaveBeenCalled()
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
