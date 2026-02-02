/**
 * Platform adapter unit tests
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  detectPlatform,
  createPlatformAdapter,
  getPlatformAdapter,
  resetPlatformAdapter,
} from '../adapter';
import { WindowsAdapter } from '../windows';
import { DarwinAdapter } from '../darwin';

describe('Platform Adapter', () => {
  afterEach(() => {
    resetPlatformAdapter();
    vi.restoreAllMocks();
  });

  describe('detectPlatform', () => {
    it('should detect win32 platform', () => {
      vi.stubGlobal('process', { ...process, platform: 'win32' });
      expect(detectPlatform()).toBe('win32');
    });

    it('should detect darwin platform', () => {
      vi.stubGlobal('process', { ...process, platform: 'darwin' });
      expect(detectPlatform()).toBe('darwin');
    });

    it('should default to darwin for unsupported platforms', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubGlobal('process', { ...process, platform: 'linux' });

      expect(detectPlatform()).toBe('darwin');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported platform')
      );
    });
  });

  describe('createPlatformAdapter', () => {
    it('should create WindowsAdapter for win32', () => {
      vi.stubGlobal('process', { ...process, platform: 'win32' });
      const adapter = createPlatformAdapter();
      expect(adapter).toBeInstanceOf(WindowsAdapter);
    });

    it('should create DarwinAdapter for darwin', () => {
      vi.stubGlobal('process', { ...process, platform: 'darwin' });
      const adapter = createPlatformAdapter();
      expect(adapter).toBeInstanceOf(DarwinAdapter);
    });
  });

  describe('getPlatformAdapter singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const adapter1 = getPlatformAdapter();
      const adapter2 = getPlatformAdapter();
      expect(adapter1).toBe(adapter2);
    });

    it('should return a new instance after reset', () => {
      const adapter1 = getPlatformAdapter();
      resetPlatformAdapter();
      const adapter2 = getPlatformAdapter();
      expect(adapter1).not.toBe(adapter2);
    });
  });
});
