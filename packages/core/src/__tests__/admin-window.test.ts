/**
 * Admin window management tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';

// Mock admin window instance
const mockAdminWindow = {
  once: vi.fn(),
  on: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  focus: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  isVisible: vi.fn(() => false),
  loadURL: vi.fn(() => Promise.resolve()),
  loadFile: vi.fn(() => Promise.resolve()),
  removeAllListeners: vi.fn(),
  setFullScreen: vi.fn(),
  isFullScreen: vi.fn(() => false),
  setKiosk: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  setSkipTaskbar: vi.fn(),
  webContents: {
    setWindowOpenHandler: vi.fn(),
    on: vi.fn(),
    openDevTools: vi.fn(),
    closeDevTools: vi.fn(),
    isDevToolsOpened: vi.fn(() => false),
    reload: vi.fn(),
    reloadIgnoringCache: vi.fn(),
  },
};

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(() => mockAdminWindow),
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      size: { width: 1920, height: 1080 },
    })),
  },
}));

vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  }),
}));

vi.mock('@kiosk/device', () => ({
  loadConfig: vi.fn(() => ({
    width: 480,
    height: 768,
  })),
}));

import { createWindowManager } from '../window';
import type { WindowManager } from '../window';

describe('Admin Window Management', () => {
  let manager: WindowManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminWindow.isDestroyed.mockReturnValue(false);
    mockAdminWindow.isVisible.mockReturnValue(false);
    manager = createWindowManager();
  });

  describe('create', () => {
    it('should create admin window with default config', () => {
      const adminWin = manager.adminWindow.create();

      expect(adminWin).toBeDefined();
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 480,
          height: 768,
          show: false,
          frame: false,
          alwaysOnTop: true,
          center: true,
        })
      );
    });

    it('should create admin window with custom size', () => {
      manager.adminWindow.create({ width: 600, height: 800 });

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 600,
          height: 800,
        })
      );
    });

    it('should create admin window with preload script', () => {
      manager.adminWindow.create({ preload: '/path/to/admin-preload.js' });

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            preload: '/path/to/admin-preload.js',
            contextIsolation: true,
            nodeIntegration: false,
          }),
        })
      );
    });

    it('should return existing admin window if already created', () => {
      const win1 = manager.adminWindow.create();
      const win2 = manager.adminWindow.create();
      expect(win1).toBe(win2);
    });

    it('should setup close intercept event', () => {
      manager.adminWindow.create();
      expect(mockAdminWindow.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('show', () => {
    it('should show and focus admin window', () => {
      manager.adminWindow.create();
      manager.adminWindow.show();

      expect(mockAdminWindow.show).toHaveBeenCalled();
      expect(mockAdminWindow.focus).toHaveBeenCalled();
    });

    it('should open DevTools when showing admin window', () => {
      manager.adminWindow.create();
      manager.adminWindow.show();

      expect(mockAdminWindow.webContents.openDevTools).toHaveBeenCalledWith({ mode: 'detach' });
    });

    it('should recreate and show admin window if not valid', () => {
      // No admin window created, show auto-recreates
      manager.adminWindow.show();
      expect(mockAdminWindow.show).toHaveBeenCalled();
      expect(mockAdminWindow.focus).toHaveBeenCalled();
    });
  });

  describe('hide', () => {
    it('should hide admin window', () => {
      manager.adminWindow.create();
      manager.adminWindow.hide();

      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });

    it('should close DevTools when hiding admin window if DevTools are open', () => {
      manager.adminWindow.create();
      mockAdminWindow.webContents.isDevToolsOpened.mockReturnValue(true);

      manager.adminWindow.hide();

      expect(mockAdminWindow.webContents.closeDevTools).toHaveBeenCalled();
      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });

    it('should not call closeDevTools if DevTools are not open', () => {
      manager.adminWindow.create();
      mockAdminWindow.webContents.isDevToolsOpened.mockReturnValue(false);

      manager.adminWindow.hide();

      expect(mockAdminWindow.webContents.closeDevTools).not.toHaveBeenCalled();
      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should show admin window when hidden', () => {
      manager.adminWindow.create();
      mockAdminWindow.isVisible.mockReturnValue(false);

      manager.adminWindow.toggle();

      expect(mockAdminWindow.show).toHaveBeenCalled();
      expect(mockAdminWindow.focus).toHaveBeenCalled();
    });

    it('should hide admin window when visible', () => {
      manager.adminWindow.create();
      mockAdminWindow.isVisible.mockReturnValue(true);

      manager.adminWindow.toggle();

      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });
  });

  describe('getWindow', () => {
    it('should return null before create', () => {
      expect(manager.adminWindow.getWindow()).toBeNull();
    });

    it('should return admin window after create', () => {
      manager.adminWindow.create();
      expect(manager.adminWindow.getWindow()).toBeDefined();
    });
  });

  describe('isValid', () => {
    it('should return false before create', () => {
      expect(manager.adminWindow.isValid()).toBe(false);
    });

    it('should return true after create', () => {
      manager.adminWindow.create();
      expect(manager.adminWindow.isValid()).toBe(true);
    });

    it('should return false if admin window is destroyed', () => {
      manager.adminWindow.create();
      mockAdminWindow.isDestroyed.mockReturnValue(true);
      expect(manager.adminWindow.isValid()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should destroy admin window and remove listeners', () => {
      manager.adminWindow.create();
      manager.adminWindow.destroy();

      expect(mockAdminWindow.removeAllListeners).toHaveBeenCalledWith('close');
      expect(mockAdminWindow.destroy).toHaveBeenCalled();
      expect(manager.adminWindow.getWindow()).toBeNull();
    });

    it('should be safe to call when no admin window exists', () => {
      // Should not throw
      manager.adminWindow.destroy();
    });
  });

  describe('WindowManager.destroy', () => {
    it('should also destroy admin window when main destroy is called', () => {
      // Create main window first, then admin
      manager.mainWindow.create();
      vi.clearAllMocks(); // Clear calls from create
      mockAdminWindow.isDestroyed.mockReturnValue(false);

      manager.adminWindow.create();
      manager.destroy();

      // Admin window should be cleaned up
      expect(mockAdminWindow.removeAllListeners).toHaveBeenCalledWith('close');
      expect(mockAdminWindow.destroy).toHaveBeenCalled();
    });
  });

  describe('close intercept', () => {
    it('should hide admin window and close DevTools on close instead of destroying', () => {
      manager.adminWindow.create();
      mockAdminWindow.webContents.isDevToolsOpened.mockReturnValue(true);

      // Get the close handler from on('close', handler)
      const closeCall = mockAdminWindow.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'close'
      );
      expect(closeCall).toBeDefined();

      const closeHandler = closeCall![1] as (event: { preventDefault: () => void }) => void;

      // Simulate close event
      const mockEvent = { preventDefault: vi.fn() };
      closeHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockAdminWindow.webContents.closeDevTools).toHaveBeenCalled();
      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });
  });
});
