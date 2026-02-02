/**
 * Window manager tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BrowserWindow
const mockWebContents = {
  setWindowOpenHandler: vi.fn(),
  on: vi.fn(),
  openDevTools: vi.fn(),
  closeDevTools: vi.fn(),
  isDevToolsOpened: vi.fn(() => false),
  reload: vi.fn(),
  reloadIgnoringCache: vi.fn(),
};

const mockWindow = {
  once: vi.fn(),
  on: vi.fn(),
  show: vi.fn(),
  focus: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  loadURL: vi.fn(() => Promise.resolve()),
  loadFile: vi.fn(() => Promise.resolve()),
  setFullScreen: vi.fn(),
  isFullScreen: vi.fn(() => false),
  setKiosk: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  setSkipTaskbar: vi.fn(),
  webContents: mockWebContents,
};

// Mock electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(() => mockWindow),
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

import { WindowManager, createWindowManager } from '../window';

describe('WindowManager', () => {
  let manager: WindowManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.isDestroyed.mockReturnValue(false);
    manager = createWindowManager();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const config = manager.getConfig();
      expect(config).toHaveProperty('width');
      expect(config).toHaveProperty('height');
      expect(config).toHaveProperty('fullscreen');
    });

    it('should merge custom config', () => {
      const customManager = createWindowManager({
        width: 800,
        height: 600,
        fullscreen: false,
      });
      const config = customManager.getConfig();
      expect(config.width).toBe(800);
      expect(config.height).toBe(600);
    });
  });

  describe('createWindow', () => {
    it('should create BrowserWindow', () => {
      const window = manager.createWindow();
      expect(window).toBeDefined();
    });

    it('should return existing window if already created', () => {
      const window1 = manager.createWindow();
      const window2 = manager.createWindow();
      expect(window1).toBe(window2);
    });

    it('should setup window events', () => {
      manager.createWindow();
      expect(mockWindow.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });
  });

  describe('getWindow', () => {
    it('should return null before createWindow', () => {
      expect(manager.getWindow()).toBeNull();
    });

    it('should return window after createWindow', () => {
      manager.createWindow();
      expect(manager.getWindow()).toBeDefined();
    });
  });

  describe('isWindowValid', () => {
    it('should return false before createWindow', () => {
      expect(manager.isWindowValid()).toBe(false);
    });

    it('should return true after createWindow', () => {
      manager.createWindow();
      expect(manager.isWindowValid()).toBe(true);
    });

    it('should return false if window is destroyed', () => {
      manager.createWindow();
      mockWindow.isDestroyed.mockReturnValue(true);
      expect(manager.isWindowValid()).toBe(false);
    });
  });

  describe('loadURL', () => {
    it('should throw if window not created', async () => {
      await expect(manager.loadURL('https://example.com')).rejects.toThrow();
    });

    it('should load URL into window', async () => {
      manager.createWindow();
      await manager.loadURL('https://example.com');
      expect(mockWindow.loadURL).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('loadFile', () => {
    it('should throw if window not created', async () => {
      await expect(manager.loadFile('/path/to/file.html')).rejects.toThrow();
    });

    it('should load file into window', async () => {
      manager.createWindow();
      await manager.loadFile('/path/to/file.html');
      expect(mockWindow.loadFile).toHaveBeenCalledWith('/path/to/file.html');
    });
  });

  describe('fullscreen methods', () => {
    beforeEach(() => {
      manager.createWindow();
    });

    it('enterFullscreen should set fullscreen true', () => {
      manager.enterFullscreen();
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });

    it('exitFullscreen should set fullscreen false', () => {
      manager.exitFullscreen();
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false);
    });

    it('toggleFullscreen should toggle state', () => {
      mockWindow.isFullScreen.mockReturnValue(false);
      manager.toggleFullscreen();
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });
  });

  describe('kiosk mode methods', () => {
    beforeEach(() => {
      manager.createWindow();
    });

    it('enterKioskMode should enable kiosk mode', () => {
      manager.enterKioskMode();
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(true);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
      expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(true);
    });

    it('exitKioskMode should disable kiosk mode', () => {
      manager.exitKioskMode();
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(false);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(false);
      expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(false);
    });
  });

  describe('DevTools methods', () => {
    beforeEach(() => {
      // Create manager with devTools enabled
      manager = createWindowManager({ devTools: true });
      manager.createWindow();
    });

    it('openDevTools should open DevTools', () => {
      manager.openDevTools();
      expect(mockWebContents.openDevTools).toHaveBeenCalled();
    });

    it('closeDevTools should close DevTools', () => {
      manager.closeDevTools();
      expect(mockWebContents.closeDevTools).toHaveBeenCalled();
    });

    it('toggleDevTools should toggle state', () => {
      mockWebContents.isDevToolsOpened.mockReturnValue(false);
      manager.toggleDevTools();
      expect(mockWebContents.openDevTools).toHaveBeenCalled();
    });
  });

  describe('reload methods', () => {
    beforeEach(() => {
      manager.createWindow();
    });

    it('reload should reload window', () => {
      manager.reload();
      expect(mockWebContents.reload).toHaveBeenCalled();
    });

    it('forceReload should reload ignoring cache', () => {
      manager.forceReload();
      expect(mockWebContents.reloadIgnoringCache).toHaveBeenCalled();
    });
  });

  describe('close and destroy', () => {
    beforeEach(() => {
      manager.createWindow();
    });

    it('close should close window', () => {
      manager.close();
      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('destroy should destroy window', () => {
      manager.destroy();
      expect(mockWindow.destroy).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      manager.updateConfig({ width: 1024 });
      expect(manager.getConfig().width).toBe(1024);
    });
  });
});
