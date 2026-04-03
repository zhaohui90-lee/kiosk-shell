/**
 * AdminWindowController tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserWindow } from 'electron'

// Mock admin window instance
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
  loadURL: vi.fn(() => Promise.resolve()),
  loadFile: vi.fn(() => Promise.resolve()),
  removeAllListeners: vi.fn(),
  webContents: {
    setWindowOpenHandler: vi.fn(),
    on: vi.fn(),
    openDevTools: vi.fn(),
    closeDevTools: vi.fn(),
    isDevToolsOpened: vi.fn(() => false),
    reload: vi.fn(),
    reloadIgnoringCache: vi.fn(),
  },
}

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(() => mockAdminWindow),
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

import { AdminWindowController } from '../window/controller/admin-window-controller'

describe('AdminWindowController', () => {
  let ctrl: AdminWindowController

  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminWindow.isDestroyed.mockReturnValue(false)
    mockAdminWindow.isVisible.mockReturnValue(false)
    ctrl = new AdminWindowController()
  })

  describe('create', () => {
    it('should create admin window with default config from device', () => {
      const win = ctrl.create({})
      expect(win).toBeDefined()
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 480,
          height: 768,
          show: false,
          alwaysOnTop: true,
          center: true,
          fullscreenable: false,
          maximizable: false,
          minimizable: false,
        })
      )
      expect(mockAdminWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver')
      expect(mockAdminWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
        visibleOnFullScreen: true,
      })
    })

    it('should create with custom size', () => {
      ctrl.create({ width: 600, height: 800 })
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 600,
          height: 800,
        })
      )
    })

    it('should apply preload to window options', () => {
      ctrl.create({ preload: '/path/to/admin-preload.js' })
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            preload: '/path/to/admin-preload.js',
            contextIsolation: true,
            nodeIntegration: false,
          }),
        })
      )
    })

    it('should set parent window when provided', () => {
      const parentWindow = {} as BrowserWindow
      ctrl.create({ parent: parentWindow })

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: parentWindow,
        })
      )
    })

    it('should return existing window if already created', () => {
      const win1 = ctrl.create({})
      const win2 = ctrl.create({})
      expect(win1).toBe(win2)
    })

    it('should setup close intercept event', () => {
      ctrl.create({})
      expect(mockAdminWindow.on).toHaveBeenCalledWith('close', expect.any(Function))
    })

    it('should load file if provided', () => {
      ctrl.create({ loadFile: '/path/to/admin.html' })
      expect(mockAdminWindow.loadFile).toHaveBeenCalledWith('/path/to/admin.html')
    })
  })

  describe('show', () => {
    it('should show and focus admin window', () => {
      ctrl.create({})
      ctrl.show(false)
      expect(mockAdminWindow.show).toHaveBeenCalled()
      expect(mockAdminWindow.moveTop).toHaveBeenCalled()
      expect(mockAdminWindow.focus).toHaveBeenCalled()
    })

    it('should open DevTools when isDev is true', () => {
      ctrl.create({})
      ctrl.show(true)
      expect(mockAdminWindow.webContents.openDevTools).toHaveBeenCalledWith({ mode: 'detach' })
    })

    it('should NOT open DevTools when isDev is false', () => {
      ctrl.create({})
      ctrl.show(false)
      expect(mockAdminWindow.webContents.openDevTools).not.toHaveBeenCalled()
    })

    it('should recreate and show if window is invalid', () => {
      ctrl.show(false)
      expect(mockAdminWindow.show).toHaveBeenCalled()
      expect(mockAdminWindow.moveTop).toHaveBeenCalled()
      expect(mockAdminWindow.focus).toHaveBeenCalled()
    })

    it('should invoke onShow hook after showing', () => {
      const onShow = vi.fn()
      const hookedController = new AdminWindowController({ onShow })

      hookedController.create({})
      hookedController.show(false)

      expect(onShow).toHaveBeenCalledTimes(1)
    })
  })

  describe('hide', () => {
    it('should hide admin window', () => {
      ctrl.create({})
      ctrl.hide()
      expect(mockAdminWindow.hide).toHaveBeenCalled()
    })

    it('should close DevTools when hiding if open', () => {
      ctrl.create({})
      mockAdminWindow.webContents.isDevToolsOpened.mockReturnValue(true)
      ctrl.hide()
      expect(mockAdminWindow.webContents.closeDevTools).toHaveBeenCalled()
      expect(mockAdminWindow.hide).toHaveBeenCalled()
    })

    it('should NOT close DevTools when not open', () => {
      ctrl.create({})
      mockAdminWindow.webContents.isDevToolsOpened.mockReturnValue(false)
      ctrl.hide()
      expect(mockAdminWindow.webContents.closeDevTools).not.toHaveBeenCalled()
      expect(mockAdminWindow.hide).toHaveBeenCalled()
    })

    it('should noop when window is invalid', () => {
      ctrl.hide() // no window created
      expect(mockAdminWindow.hide).not.toHaveBeenCalled()
    })

    it('should invoke onHide hook after hiding', () => {
      const onHide = vi.fn()
      const hookedController = new AdminWindowController({ onHide })

      hookedController.create({})
      hookedController.hide()

      expect(onHide).toHaveBeenCalledTimes(1)
    })
  })

  describe('toggle', () => {
    it('should show when hidden', () => {
      ctrl.create({})
      mockAdminWindow.isVisible.mockReturnValue(false)
      ctrl.toggle(false)
      expect(mockAdminWindow.show).toHaveBeenCalled()
      expect(mockAdminWindow.focus).toHaveBeenCalled()
    })

    it('should hide when visible', () => {
      ctrl.create({})
      mockAdminWindow.isVisible.mockReturnValue(true)
      ctrl.toggle(false)
      expect(mockAdminWindow.hide).toHaveBeenCalled()
    })

    it('should show when no window exists', () => {
      ctrl.toggle(false)
      expect(mockAdminWindow.show).toHaveBeenCalled()
    })
  })

  describe('getWindow', () => {
    it('should return null before create', () => {
      expect(ctrl.getWindow()).toBeNull()
    })

    it('should return window after create', () => {
      ctrl.create({})
      expect(ctrl.getWindow()).toBeDefined()
    })
  })

  describe('isValid', () => {
    it('should return false before create', () => {
      expect(ctrl.isValid()).toBe(false)
    })

    it('should return true after create', () => {
      ctrl.create({})
      expect(ctrl.isValid()).toBe(true)
    })

    it('should return false if window is destroyed', () => {
      ctrl.create({})
      mockAdminWindow.isDestroyed.mockReturnValue(true)
      expect(ctrl.isValid()).toBe(false)
    })
  })

  describe('isVisible', () => {
    it('should return false before create', () => {
      expect(ctrl.isVisible()).toBe(false)
    })

    it('should return true when window is visible', () => {
      ctrl.create({})
      mockAdminWindow.isVisible.mockReturnValue(true)
      expect(ctrl.isVisible()).toBe(true)
    })
  })

  describe('destroy', () => {
    it('should destroy window and remove listeners', () => {
      ctrl.create({})
      ctrl.destroy()
      expect(mockAdminWindow.removeAllListeners).toHaveBeenCalledWith('close')
      expect(mockAdminWindow.destroy).toHaveBeenCalled()
      expect(ctrl.getWindow()).toBeNull()
    })

    it('should be safe when no window exists', () => {
      ctrl.destroy() // should not throw
    })
  })

  describe('close intercept', () => {
    it('should hide instead of destroying on close', () => {
      ctrl.create({})

      const closeCall = mockAdminWindow.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'close'
      )
      expect(closeCall).toBeDefined()

      const closeHandler = closeCall![1] as (event: { preventDefault: () => void }) => void
      const mockEvent = { preventDefault: vi.fn() }
      closeHandler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockAdminWindow.hide).toHaveBeenCalled()
    })
  })
})
