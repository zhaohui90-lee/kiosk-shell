/**
 * Lifecycle manager tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron app module
vi.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: vi.fn(() => true),
    on: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    quit: vi.fn(),
    exit: vi.fn(),
    relaunch: vi.fn(),
    getVersion: vi.fn(() => '1.0.0'),
    getName: vi.fn(() => 'kiosk-shell'),
    getAppPath: vi.fn(() => '/mock/app/path'),
    getPath: vi.fn((name: string) => `/mock/${name}`),
    isPackaged: false,
    hide: vi.fn(),
    show: vi.fn(),
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
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

import { LifecycleManager, createLifecycleManager } from '../lifecycle';

describe('LifecycleManager', () => {
  let manager: LifecycleManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createLifecycleManager();
  });

  describe('constructor', () => {
    it('should create instance with default state', () => {
      const state = manager.getState();
      expect(state.isReady).toBe(false);
      expect(state.isQuitting).toBe(false);
      expect(state.mainWindow).toBeNull();
      expect(state.activeSlot).toBe('slot-a');
    });
  });

  describe('event handlers', () => {
    it('should register event handler', () => {
      const handler = vi.fn();
      manager.on('ready', handler);

      // Handler should be registered (internal state)
      expect(() => manager.on('ready', handler)).not.toThrow();
    });

    it('should remove event handler', () => {
      const handler = vi.fn();
      manager.on('ready', handler);
      manager.off('ready', handler);

      // Should not throw
      expect(() => manager.off('ready', handler)).not.toThrow();
    });
  });

  describe('state methods', () => {
    it('isReady should return false initially', () => {
      expect(manager.isReady()).toBe(false);
    });

    it('isQuitting should return false initially', () => {
      expect(manager.isQuitting()).toBe(false);
    });

    it('setActiveSlot should update state', () => {
      manager.setActiveSlot('slot-b');
      expect(manager.getState().activeSlot).toBe('slot-b');
    });

    it('setMainWindow should update state', () => {
      const mockWindow = { id: 1 };
      manager.setMainWindow(mockWindow as unknown as null);
      expect(manager.getMainWindow()).toBe(mockWindow);
    });
  });

  describe('app info methods', () => {
    it('getVersion should return app version', () => {
      expect(manager.getVersion()).toBe('1.0.0');
    });

    it('getName should return app name', () => {
      expect(manager.getName()).toBe('kiosk-shell');
    });

    it('getAppPath should return app path', () => {
      expect(manager.getAppPath()).toBe('/mock/app/path');
    });

    it('getUserDataPath should return userData path', () => {
      expect(manager.getUserDataPath()).toBe('/mock/userData');
    });

    it('isPackaged should return false in test', () => {
      expect(manager.isPackaged()).toBe(false);
    });
  });

  describe('isKioskMode', () => {
    it('should check environment variables', () => {
      // In test environment, should check NODE_ENV
      const isKiosk = manager.isKioskMode();
      expect(typeof isKiosk).toBe('boolean');
    });
  });

  describe('getLoginItemSettings', () => {
    it('should return login item settings', () => {
      const settings = manager.getLoginItemSettings();
      expect(settings).toHaveProperty('openAtLogin');
    });
  });
});
