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

  describe('createAdminWindow', () => {
    it('should create admin window with default config', () => {
      const adminWin = manager.createAdminWindow();

      expect(adminWin).toBeDefined();
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 480,
          height: 600,
          show: false,
          frame: false,
          alwaysOnTop: true,
          center: true,
        })
      );
    });

    it('should create admin window with custom size', () => {
      manager.createAdminWindow({ width: 600, height: 800 });

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 600,
          height: 800,
        })
      );
    });

    it('should create admin window with preload script', () => {
      manager.createAdminWindow({ preload: '/path/to/admin-preload.js' });

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
      const win1 = manager.createAdminWindow();
      const win2 = manager.createAdminWindow();
      expect(win1).toBe(win2);
    });

    it('should setup close intercept event', () => {
      manager.createAdminWindow();
      expect(mockAdminWindow.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('showAdminWindow', () => {
    it('should show and focus admin window', () => {
      manager.createAdminWindow();
      manager.showAdminWindow();

      expect(mockAdminWindow.show).toHaveBeenCalled();
      expect(mockAdminWindow.focus).toHaveBeenCalled();
    });

    it('should not show if admin window is not valid', () => {
      // No admin window created
      manager.showAdminWindow();
      expect(mockAdminWindow.show).not.toHaveBeenCalled();
    });
  });

  describe('hideAdminWindow', () => {
    it('should hide admin window', () => {
      manager.createAdminWindow();
      manager.hideAdminWindow();

      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });
  });

  describe('toggleAdminWindow', () => {
    it('should show admin window when hidden', () => {
      manager.createAdminWindow();
      mockAdminWindow.isVisible.mockReturnValue(false);

      manager.toggleAdminWindow();

      expect(mockAdminWindow.show).toHaveBeenCalled();
      expect(mockAdminWindow.focus).toHaveBeenCalled();
    });

    it('should hide admin window when visible', () => {
      manager.createAdminWindow();
      mockAdminWindow.isVisible.mockReturnValue(true);

      manager.toggleAdminWindow();

      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });
  });

  describe('getAdminWindow', () => {
    it('should return null before createAdminWindow', () => {
      expect(manager.getAdminWindow()).toBeNull();
    });

    it('should return admin window after createAdminWindow', () => {
      manager.createAdminWindow();
      expect(manager.getAdminWindow()).toBeDefined();
    });
  });

  describe('isAdminWindowValid', () => {
    it('should return false before createAdminWindow', () => {
      expect(manager.isAdminWindowValid()).toBe(false);
    });

    it('should return true after createAdminWindow', () => {
      manager.createAdminWindow();
      expect(manager.isAdminWindowValid()).toBe(true);
    });

    it('should return false if admin window is destroyed', () => {
      manager.createAdminWindow();
      mockAdminWindow.isDestroyed.mockReturnValue(true);
      expect(manager.isAdminWindowValid()).toBe(false);
    });
  });

  describe('destroyAdminWindow', () => {
    it('should destroy admin window and remove listeners', () => {
      manager.createAdminWindow();
      manager.destroyAdminWindow();

      expect(mockAdminWindow.removeAllListeners).toHaveBeenCalledWith('close');
      expect(mockAdminWindow.destroy).toHaveBeenCalled();
      expect(manager.getAdminWindow()).toBeNull();
    });

    it('should be safe to call when no admin window exists', () => {
      // Should not throw
      manager.destroyAdminWindow();
    });
  });

  describe('destroy (main window cleanup)', () => {
    it('should also destroy admin window when main destroy is called', () => {
      // Create main window first, then admin
      manager.createWindow();
      vi.clearAllMocks(); // Clear calls from createWindow
      mockAdminWindow.isDestroyed.mockReturnValue(false);

      manager.createAdminWindow();
      manager.destroy();

      // Admin window should be cleaned up
      expect(mockAdminWindow.removeAllListeners).toHaveBeenCalledWith('close');
      expect(mockAdminWindow.destroy).toHaveBeenCalled();
    });
  });

  describe('close intercept', () => {
    it('should hide admin window on close instead of destroying', () => {
      manager.createAdminWindow();

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
      expect(mockAdminWindow.hide).toHaveBeenCalled();
    });
  });
});
