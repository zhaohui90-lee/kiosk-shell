/**
 * Resource loader tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// Mock electron app module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return '/mock/user/data';
      }
      return '/mock/path';
    }),
    getAppPath: vi.fn(() => '/mock/app/path'),
    isPackaged: false,
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  accessSync: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
  promises: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
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

import { ResourceLoader, createResourceLoader } from '../loader';
import type { SlotId } from '../types';

describe('ResourceLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with basePath', () => {
      const loader = createResourceLoader({ basePath: '/test/path' });
      expect(loader.getConfig().basePath).toBe('/test/path');
    });

    it('should set default entry file', () => {
      const loader = createResourceLoader({ basePath: '/test/path' });
      expect(loader.getConfig().entryFile).toBe('index.html');
    });

    it('should set default useKioskProtocol', () => {
      const loader = createResourceLoader({ basePath: '/test/path' });
      expect(loader.getConfig().useKioskProtocol).toBe(true);
    });

    it('should allow custom entry file', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        entryFile: 'main.html',
      });
      expect(loader.getConfig().entryFile).toBe('main.html');
    });
  });

  describe('getActiveSlot', () => {
    it('should return default slot-a', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        enableSlotSwitching: true,
      });
      expect(loader.getActiveSlot()).toBe('slot-a');
    });
  });

  describe('getInactiveSlot', () => {
    it('should return slot-b when active is slot-a', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        enableSlotSwitching: true,
      });
      expect(loader.getInactiveSlot()).toBe('slot-b');
    });
  });

  describe('getResourcePath', () => {
    it('should return basePath when slot switching disabled', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        enableSlotSwitching: false,
      });
      expect(loader.getResourcePath()).toBe('/test/path');
    });

    it('should include slot in path when slot switching enabled', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        enableSlotSwitching: true,
      });
      const resourcePath = loader.getResourcePath();
      expect(resourcePath).toContain('slot-a');
      expect(resourcePath).toContain('dist');
    });
  });

  describe('getFilePath', () => {
    it('should resolve relative path correctly', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        enableSlotSwitching: false,
      });
      const filePath = loader.getFilePath('assets/style.css');
      expect(filePath).toBe(path.join('/test/path', 'assets/style.css'));
    });
  });

  describe('getEntryURL', () => {
    it('should return kiosk:// URL when protocol enabled', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        useKioskProtocol: true,
      });
      const url = loader.getEntryURL();
      expect(url).toBe('kiosk://app/index.html');
    });

    it('should return file:// URL when protocol disabled', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        useKioskProtocol: false,
      });
      const url = loader.getEntryURL();
      expect(url.startsWith('file://')).toBe(true);
    });
  });

  describe('getInactiveSlotPath', () => {
    it('should return path to inactive slot', () => {
      const loader = createResourceLoader({
        basePath: '/test/path',
        enableSlotSwitching: true,
      });
      const inactivePath = loader.getInactiveSlotPath();
      expect(inactivePath).toContain('slot-b');
    });
  });

  describe('static methods', () => {
    it('getDefaultBusinessPath should return userData/business', () => {
      const defaultPath = ResourceLoader.getDefaultBusinessPath();
      expect(defaultPath).toContain('business');
    });

    it('getBackupPath should return userData/backup/last-working', () => {
      const backupPath = ResourceLoader.getBackupPath();
      expect(backupPath).toContain('backup');
      expect(backupPath).toContain('last-working');
    });
  });
});
