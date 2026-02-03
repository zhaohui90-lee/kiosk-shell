/**
 * Tests for kiosk mode manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import {
  setExitPassword,
  verifyExitPassword,
  getKioskState,
  isKioskModeEnabled,
  enableKioskMode,
  disableKioskMode,
  toggleKioskMode,
  updateKioskConfig,
  resetKioskStates,
  getKioskModeWindows,
} from '../kiosk-mode';
import { resetBlockerStates, setShortcutHandler } from '../shortcuts';
import type { ShortcutHandler } from '../types';
import { ERROR_MESSAGES } from '../constants';

// Mock BrowserWindow
function createMockWindow(id: number): BrowserWindow {
  return {
    id,
    isDestroyed: () => false,
    setFullScreen: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setMenuBarVisibility: vi.fn(),
    setAutoHideMenuBar: vi.fn(),
  } as unknown as BrowserWindow;
}

// Mock ShortcutHandler for testing
function createMockShortcutHandler(): ShortcutHandler {
  const registered = new Map<number, Set<string>>();

  return {
    register(window: BrowserWindow, accelerator: string, _callback: () => void): void {
      const windowId = window.id;
      if (!registered.has(windowId)) {
        registered.set(windowId, new Set());
      }
      registered.get(windowId)!.add(accelerator);
    },
    unregister(window: BrowserWindow, accelerator: string): void {
      const shortcuts = registered.get(window.id);
      if (shortcuts) {
        shortcuts.delete(accelerator);
      }
    },
    unregisterAll(window: BrowserWindow): void {
      registered.delete(window.id);
    },
    isRegistered(window: BrowserWindow, accelerator: string): boolean {
      const shortcuts = registered.get(window.id);
      return shortcuts ? shortcuts.has(accelerator) : false;
    },
  };
}

describe('Kiosk Mode Manager', () => {
  let mockWindow: BrowserWindow;

  beforeEach(() => {
    resetKioskStates();
    resetBlockerStates();
    setShortcutHandler(createMockShortcutHandler());
    mockWindow = createMockWindow(1);
  });

  describe('setExitPassword / verifyExitPassword', () => {
    beforeEach(() => {
      setExitPassword(undefined);
    });

    it('should verify successfully when no password is set', () => {
      expect(verifyExitPassword('anything')).toBe(true);
    });

    it('should verify correct password', () => {
      setExitPassword('secret123');
      expect(verifyExitPassword('secret123')).toBe(true);
    });

    it('should reject incorrect password', () => {
      setExitPassword('secret123');
      expect(verifyExitPassword('wrong')).toBe(false);
    });

    it('should allow resetting password to undefined', () => {
      setExitPassword('secret123');
      setExitPassword(undefined);
      expect(verifyExitPassword('anything')).toBe(true);
    });
  });

  describe('enableKioskMode', () => {
    it('should return error when no window is provided', () => {
      const result = enableKioskMode(null as unknown as BrowserWindow);
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.NO_WINDOW);
    });

    it('should enable kiosk mode with default config', () => {
      const result = enableKioskMode(mockWindow);
      expect(result.success).toBe(true);
      expect(isKioskModeEnabled(mockWindow)).toBe(true);
    });

    it('should call setFullScreen when fullscreen is true', () => {
      enableKioskMode(mockWindow, { fullscreen: true });
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });

    it('should call setAlwaysOnTop when alwaysOnTop is true', () => {
      enableKioskMode(mockWindow, { alwaysOnTop: true });
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
    });

    it('should call setMenuBarVisibility when disableMenuBar is true', () => {
      enableKioskMode(mockWindow, { disableMenuBar: true });
      expect(mockWindow.setMenuBarVisibility).toHaveBeenCalledWith(false);
      expect(mockWindow.setAutoHideMenuBar).toHaveBeenCalledWith(true);
    });

    it('should return error when already enabled', () => {
      enableKioskMode(mockWindow);
      const result = enableKioskMode(mockWindow);
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.KIOSK_MODE_ALREADY_ENABLED);
    });

    it('should store exit password from config', () => {
      enableKioskMode(mockWindow, { exitPassword: 'test123' });
      expect(verifyExitPassword('test123')).toBe(true);
      expect(verifyExitPassword('wrong')).toBe(false);
    });
  });

  describe('disableKioskMode', () => {
    it('should return error when no window is provided', () => {
      const result = disableKioskMode(null as unknown as BrowserWindow);
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.NO_WINDOW);
    });

    it('should return error when kiosk mode is not enabled', () => {
      const result = disableKioskMode(mockWindow);
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.KIOSK_MODE_NOT_ENABLED);
    });

    it('should disable kiosk mode', () => {
      enableKioskMode(mockWindow);
      const result = disableKioskMode(mockWindow);
      expect(result.success).toBe(true);
      expect(isKioskModeEnabled(mockWindow)).toBe(false);
    });

    it('should restore window settings', () => {
      enableKioskMode(mockWindow, {
        fullscreen: true,
        alwaysOnTop: true,
        disableMenuBar: true,
      });
      disableKioskMode(mockWindow);

      expect(mockWindow.setFullScreen).toHaveBeenLastCalledWith(false);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenLastCalledWith(false);
      expect(mockWindow.setMenuBarVisibility).toHaveBeenLastCalledWith(true);
      expect(mockWindow.setAutoHideMenuBar).toHaveBeenLastCalledWith(false);
    });

    it('should require password when set', () => {
      enableKioskMode(mockWindow, { exitPassword: 'secret' });
      const result = disableKioskMode(mockWindow, 'wrong');
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_PASSWORD);
    });

    it('should allow disable with correct password', () => {
      enableKioskMode(mockWindow, { exitPassword: 'secret' });
      const result = disableKioskMode(mockWindow, 'secret');
      expect(result.success).toBe(true);
    });
  });

  describe('getKioskState', () => {
    it('should return undefined for window without kiosk mode', () => {
      expect(getKioskState(mockWindow)).toBeUndefined();
    });

    it('should return state after enabling', () => {
      enableKioskMode(mockWindow);
      const state = getKioskState(mockWindow);
      expect(state).toBeDefined();
      expect(state?.enabled).toBe(true);
    });

    it('should include config in state', () => {
      enableKioskMode(mockWindow, { allowDevTools: true });
      const state = getKioskState(mockWindow);
      expect(state?.config.allowDevTools).toBe(true);
    });
  });

  describe('isKioskModeEnabled', () => {
    it('should return false for window without kiosk mode', () => {
      expect(isKioskModeEnabled(mockWindow)).toBe(false);
    });

    it('should return true after enabling', () => {
      enableKioskMode(mockWindow);
      expect(isKioskModeEnabled(mockWindow)).toBe(true);
    });

    it('should return false after disabling', () => {
      enableKioskMode(mockWindow);
      disableKioskMode(mockWindow);
      expect(isKioskModeEnabled(mockWindow)).toBe(false);
    });
  });

  describe('toggleKioskMode', () => {
    it('should enable when not enabled', () => {
      const result = toggleKioskMode(mockWindow);
      expect(result.success).toBe(true);
      expect(isKioskModeEnabled(mockWindow)).toBe(true);
    });

    it('should disable when enabled', () => {
      enableKioskMode(mockWindow);
      const result = toggleKioskMode(mockWindow);
      expect(result.success).toBe(true);
      expect(isKioskModeEnabled(mockWindow)).toBe(false);
    });

    it('should use config when enabling', () => {
      toggleKioskMode(mockWindow, { allowDevTools: true });
      const state = getKioskState(mockWindow);
      expect(state?.config.allowDevTools).toBe(true);
    });

    it('should use password when disabling', () => {
      enableKioskMode(mockWindow, { exitPassword: 'secret' });
      const result = toggleKioskMode(mockWindow, undefined, 'secret');
      expect(result.success).toBe(true);
    });
  });

  describe('updateKioskConfig', () => {
    it('should return error when kiosk mode is not enabled', () => {
      const result = updateKioskConfig(mockWindow, { allowDevTools: true });
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.KIOSK_MODE_NOT_ENABLED);
    });

    it('should update config', () => {
      enableKioskMode(mockWindow, { allowDevTools: false });
      updateKioskConfig(mockWindow, { allowDevTools: true });
      const state = getKioskState(mockWindow);
      expect(state?.config.allowDevTools).toBe(true);
    });

    it('should preserve other config options', () => {
      enableKioskMode(mockWindow, { fullscreen: true, allowDevTools: false });
      updateKioskConfig(mockWindow, { allowDevTools: true });
      const state = getKioskState(mockWindow);
      expect(state?.config.fullscreen).toBe(true);
      expect(state?.config.allowDevTools).toBe(true);
    });
  });

  describe('getKioskModeWindows', () => {
    it('should return empty array when no windows in kiosk mode', () => {
      expect(getKioskModeWindows()).toEqual([]);
    });

    it('should return window IDs with kiosk mode enabled', () => {
      const window1 = createMockWindow(1);
      const window2 = createMockWindow(2);
      const window3 = createMockWindow(3);

      enableKioskMode(window1);
      enableKioskMode(window2);
      enableKioskMode(window3);
      disableKioskMode(window2);

      const windows = getKioskModeWindows();
      expect(windows).toContain(1);
      expect(windows).not.toContain(2);
      expect(windows).toContain(3);
    });
  });

  describe('resetKioskStates', () => {
    it('should clear all kiosk states', () => {
      const window1 = createMockWindow(1);
      const window2 = createMockWindow(2);

      enableKioskMode(window1);
      enableKioskMode(window2);
      setExitPassword('secret');

      resetKioskStates();

      expect(getKioskState(window1)).toBeUndefined();
      expect(getKioskState(window2)).toBeUndefined();
      expect(verifyExitPassword('anything')).toBe(true); // Password should be cleared
    });
  });
});
