/**
 * Darwin (macOS) platform adapter unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DarwinAdapter } from '../darwin';

describe('DarwinAdapter', () => {
  let adapter: DarwinAdapter;

  beforeEach(() => {
    adapter = new DarwinAdapter();
  });

  describe('getPlatform', () => {
    it('should return darwin', () => {
      expect(adapter.getPlatform()).toBe('darwin');
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information', () => {
      const info = adapter.getSystemInfo();

      expect(info).toHaveProperty('platform', 'darwin');
      expect(info).toHaveProperty('arch');
      expect(info).toHaveProperty('hostname');
      expect(info).toHaveProperty('release');
      expect(info).toHaveProperty('totalMemory');
      expect(info).toHaveProperty('freeMemory');
      expect(info).toHaveProperty('cpuCount');

      expect(typeof info.arch).toBe('string');
      expect(typeof info.totalMemory).toBe('number');
      expect(info.totalMemory).toBeGreaterThan(0);
      expect(info.cpuCount).toBeGreaterThan(0);
    });
  });

  describe('blockShortcuts', () => {
    it('should store blocked shortcuts', () => {
      adapter.blockShortcuts({
        blocked: ['Cmd+Q', 'Cmd+Tab'],
        allowDevTools: true,
      });

      const blocked = adapter.getBlockedShortcuts();
      expect(blocked).toContain('Cmd+Q');
      expect(blocked).toContain('Cmd+Tab');
    });

    it('should block DevTools shortcuts when allowDevTools is false', () => {
      adapter.blockShortcuts({
        blocked: ['Cmd+Q'],
        allowDevTools: false,
      });

      const blocked = adapter.getBlockedShortcuts();
      expect(blocked).toContain('Cmd+Q');
      expect(blocked).toContain('F12');
      expect(blocked).toContain('Cmd+Option+I');
    });

    it('should not duplicate DevTools shortcuts', () => {
      adapter.blockShortcuts({
        blocked: ['F12', 'Cmd+Option+I'],
        allowDevTools: false,
      });

      const blocked = adapter.getBlockedShortcuts();
      const f12Count = blocked.filter((s) => s === 'F12').length;
      expect(f12Count).toBe(1);
    });
  });

  describe('unblockShortcuts', () => {
    it('should clear all blocked shortcuts', () => {
      adapter.blockShortcuts({
        blocked: ['Cmd+Q', 'Cmd+Tab'],
      });

      adapter.unblockShortcuts();

      const blocked = adapter.getBlockedShortcuts();
      expect(blocked).toHaveLength(0);
    });
  });

  describe('kioskMode', () => {
    it('should initially not be in kiosk mode', () => {
      expect(adapter.isKioskMode()).toBe(false);
    });

    it('should enable kiosk mode', async () => {
      await adapter.enableKioskMode();
      expect(adapter.isKioskMode()).toBe(true);
    });

    it('should disable kiosk mode', async () => {
      await adapter.enableKioskMode();
      await adapter.disableKioskMode();
      expect(adapter.isKioskMode()).toBe(false);
    });

    it('should unblock shortcuts when disabling kiosk mode', async () => {
      adapter.blockShortcuts({ blocked: ['Cmd+Q'] });
      await adapter.enableKioskMode();
      await adapter.disableKioskMode();

      expect(adapter.getBlockedShortcuts()).toHaveLength(0);
    });
  });

  describe('openExternal', () => {
    it('should reject invalid URLs', async () => {
      await expect(adapter.openExternal('not-a-url')).rejects.toThrow(
        'Invalid URL provided'
      );
    });

    it('should reject non-http URLs', async () => {
      await expect(adapter.openExternal('file:///etc/passwd')).rejects.toThrow(
        'Invalid URL provided'
      );
      await expect(adapter.openExternal('javascript:alert(1)')).rejects.toThrow(
        'Invalid URL provided'
      );
    });
  });

  describe('getAppDataPath', () => {
    it('should return a path containing Library/Application Support', () => {
      const path = adapter.getAppDataPath();
      expect(path).toContain('Library');
      expect(path).toContain('Application Support');
      expect(path.endsWith('kiosk-shell')).toBe(true);
    });
  });

  describe('getUserDataPath', () => {
    it('should return the same as app data path', () => {
      expect(adapter.getUserDataPath()).toBe(adapter.getAppDataPath());
    });
  });
});
