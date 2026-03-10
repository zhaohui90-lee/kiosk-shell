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

import { createWindowManager } from '../window';

describe('WindowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.isDestroyed.mockReturnValue(false);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const manager = createWindowManager();
      const config = manager.mainWindow.getConfig();
      expect(config).toHaveProperty('width');
      expect(config).toHaveProperty('height');
      expect(config).toHaveProperty('fullscreen');
    });

    it('should merge custom config', () => {
      const manager = createWindowManager({
        width: 800,
        height: 600,
        fullscreen: false,
      });
      const config = manager.mainWindow.getConfig();
      expect(config.width).toBe(800);
      expect(config.height).toBe(600);
    });
  });

  describe('mainWindow.create', () => {
    it('should create BrowserWindow', () => {
      const manager = createWindowManager();
      const window = manager.mainWindow.create();
      expect(window).toBeDefined();
    });

    it('should return existing window if already created', () => {
      const manager = createWindowManager();
      const window1 = manager.mainWindow.create();
      const window2 = manager.mainWindow.create();
      expect(window1).toBe(window2);
    });

    it('should setup window events', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      expect(mockWindow.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });
  });

  describe('mainWindow.getWindow', () => {
    it('should return null before create', () => {
      const manager = createWindowManager();
      expect(manager.mainWindow.getWindow()).toBeNull();
    });

    it('should return window after create', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      expect(manager.mainWindow.getWindow()).toBeDefined();
    });
  });

  describe('mainWindow.isValid', () => {
    it('should return false before create', () => {
      const manager = createWindowManager();
      expect(manager.mainWindow.isValid()).toBe(false);
    });

    it('should return true after create', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      expect(manager.mainWindow.isValid()).toBe(true);
    });

    it('should return false if window is destroyed', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      mockWindow.isDestroyed.mockReturnValue(true);
      expect(manager.mainWindow.isValid()).toBe(false);
    });
  });

  describe('mainWindow.loadURL', () => {
    it('should throw if window not created', async () => {
      const manager = createWindowManager();
      await expect(manager.mainWindow.loadURL('https://example.com')).rejects.toThrow();
    });

    it('should load URL into window', async () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      await manager.mainWindow.loadURL('https://example.com');
      expect(mockWindow.loadURL).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('mainWindow.loadFile', () => {
    it('should throw if window not created', async () => {
      const manager = createWindowManager();
      await expect(manager.mainWindow.loadFile('/path/to/file.html')).rejects.toThrow();
    });

    it('should load file into window', async () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      await manager.mainWindow.loadFile('/path/to/file.html');
      expect(mockWindow.loadFile).toHaveBeenCalledWith('/path/to/file.html');
    });
  });

  describe('fullscreen methods', () => {
    it('enterFullscreen should set fullscreen true', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.mainWindow.enterFullscreen();
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });

    it('exitFullscreen should set fullscreen false', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.mainWindow.exitFullscreen();
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false);
    });

    it('toggleFullscreen should toggle state', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      mockWindow.isFullScreen.mockReturnValue(false);
      manager.mainWindow.toggleFullscreen();
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });
  });

  describe('kiosk mode methods', () => {
    it('enterKioskMode should enable kiosk mode', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.mainWindow.enterKioskMode();
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(true);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
      expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(true);
    });

    it('exitKioskMode should disable kiosk mode', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.mainWindow.exitKioskMode();
      expect(mockWindow.setKiosk).toHaveBeenCalledWith(false);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(false);
      expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(false);
    });
  });

  describe('DevTools methods', () => {
    it('openDevTools should open DevTools', () => {
      const manager = createWindowManager({ devTools: true });
      manager.mainWindow.create();
      manager.mainWindow.openDevTools();
      expect(mockWebContents.openDevTools).toHaveBeenCalled();
    });

    it('closeDevTools should close DevTools', () => {
      const manager = createWindowManager({ devTools: true });
      manager.mainWindow.create();
      manager.mainWindow.closeDevTools();
      expect(mockWebContents.closeDevTools).toHaveBeenCalled();
    });

    it('toggleDevTools should toggle state', () => {
      const manager = createWindowManager({ devTools: true });
      manager.mainWindow.create();
      mockWebContents.isDevToolsOpened.mockReturnValue(false);
      manager.mainWindow.toggleDevTools();
      expect(mockWebContents.openDevTools).toHaveBeenCalled();
    });
  });

  describe('reload methods', () => {
    it('reload should reload window', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.mainWindow.reload();
      expect(mockWebContents.reload).toHaveBeenCalled();
    });

    it('forceReload should reload ignoring cache', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.mainWindow.forceReload();
      expect(mockWebContents.reloadIgnoringCache).toHaveBeenCalled();
    });
  });

  describe('close and destroy', () => {
    it('close should close window', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.mainWindow.close();
      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('destroy should destroy window', () => {
      const manager = createWindowManager();
      manager.mainWindow.create();
      manager.destroy();
      expect(mockWindow.destroy).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const manager = createWindowManager();
      manager.mainWindow.updateConfig({ width: 1024 });
      expect(manager.mainWindow.getConfig().width).toBe(1024);
    });
  });
});
