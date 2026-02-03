/**
 * Tests for shell updater
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getShellUpdaterState,
  getCurrentVersion,
  isUpdateAvailable,
  isUpdateReady,
  startAutoUpdateCheck,
  stopAutoUpdateCheck,
  updateShellUpdaterConfig,
  resetShellUpdaterState,
} from '../shell-updater';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock electron-updater (not available in test environment)
vi.mock('electron-updater', () => ({
  autoUpdater: {
    on: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    setFeedURL: vi.fn(),
    channel: 'stable',
    autoDownload: true,
    autoInstallOnAppQuit: true,
  },
}));

// Mock electron
vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
  },
}));

describe('Shell Updater', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetShellUpdaterState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getShellUpdaterState', () => {
    it('should return default state', () => {
      const state = getShellUpdaterState();

      expect(state).toBeDefined();
      expect(state.status).toBe('idle');
      expect(state.downloadProgress).toBe(0);
    });

    it('should return a copy of state', () => {
      const state1 = getShellUpdaterState();
      const state2 = getShellUpdaterState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version', () => {
      const version = getCurrentVersion();

      // Initial version is '0.0.0' until initShellUpdater is called
      expect(version).toBe('0.0.0');
    });
  });

  describe('isUpdateAvailable', () => {
    it('should return false when no update available', () => {
      expect(isUpdateAvailable()).toBe(false);
    });
  });

  describe('isUpdateReady', () => {
    it('should return false when no update downloaded', () => {
      expect(isUpdateReady()).toBe(false);
    });
  });

  describe('startAutoUpdateCheck', () => {
    it('should start auto update check timer', () => {
      startAutoUpdateCheck();

      // Timer should be set
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('should clear previous timer when called again', () => {
      startAutoUpdateCheck();
      const timerCount1 = vi.getTimerCount();

      startAutoUpdateCheck();
      const timerCount2 = vi.getTimerCount();

      // Should still have the same number of timers (old one cleared)
      expect(timerCount2).toBe(timerCount1);
    });
  });

  describe('stopAutoUpdateCheck', () => {
    it('should stop auto update check timer', () => {
      startAutoUpdateCheck();
      stopAutoUpdateCheck();

      // Timer should be cleared
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should not throw when called without starting', () => {
      expect(() => stopAutoUpdateCheck()).not.toThrow();
    });
  });

  describe('updateShellUpdaterConfig', () => {
    it('should update configuration without throwing', () => {
      expect(() =>
        updateShellUpdaterConfig({
          autoDownload: false,
          checkIntervalMs: 7200000,
        })
      ).not.toThrow();
    });
  });

  describe('resetShellUpdaterState', () => {
    it('should reset state to defaults', () => {
      // Modify state
      startAutoUpdateCheck();

      // Reset
      resetShellUpdaterState();

      const state = getShellUpdaterState();
      expect(state.status).toBe('idle');
      expect(state.downloadProgress).toBe(0);
    });

    it('should stop auto update check', () => {
      startAutoUpdateCheck();
      resetShellUpdaterState();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('state properties', () => {
    it('should have status property', () => {
      const state = getShellUpdaterState();
      expect(state.status).toBeDefined();
    });

    it('should have currentVersion property', () => {
      const state = getShellUpdaterState();
      expect(state.currentVersion).toBeDefined();
    });

    it('should have downloadProgress property', () => {
      const state = getShellUpdaterState();
      expect(typeof state.downloadProgress).toBe('number');
    });
  });
});
