/**
 * Configuration module tests
 * Tests config loading, saving, and path resolution for dev/production
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock electron
const mockGetPath = vi.fn((name: string) => `/mock/${name}`);
const mockGetAppPath = vi.fn(() => '/mock/app');

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (...args: unknown[]) => mockGetPath(...(args as [string])),
    getAppPath: () => mockGetAppPath(),
  },
}));

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Set process.resourcesPath for production tests (only exists in Electron)
const MOCK_RESOURCES_PATH = '/mock/resources';

// Import after mocks
import {
  loadConfig,
  saveConfig,
  ensureConfigFile,
  generateCSP,
  getDefaultConfig,
} from '../main/config';
import { app } from 'electron';

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);

describe('Config Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to development mode
    Object.defineProperty(app, 'isPackaged', {
      value: false,
      writable: true,
      configurable: true,
    });
    // Ensure process.resourcesPath is defined for production tests
    Object.defineProperty(process, 'resourcesPath', {
      value: MOCK_RESOURCES_PATH,
      writable: true,
      configurable: true,
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', () => {
      mockedExistsSync.mockReturnValue(false);

      const config = loadConfig();

      expect(config.crashMonitoring).toBe(true);
      expect(config.blankDetection).toBe(true);
      expect(config.contentUrl).toBe('kiosk://renderer/index.html');
    });

    it('should load and merge config from file in development', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          kioskMode: true,
          devMode: true,
          width: 1024,
        })
      );

      const config = loadConfig();

      expect(config.kioskMode).toBe(true);
      expect(config.devMode).toBe(true);
      expect(config.width).toBe(1024);
      // Defaults should be preserved for unset values
      expect(config.crashMonitoring).toBe(true);
      expect(config.contentUrl).toBe('kiosk://renderer/index.html');
    });

    it('should read config from project root in development', () => {
      mockGetAppPath.mockReturnValue('/dev/project');
      mockedExistsSync.mockReturnValue(false);

      loadConfig();

      expect(mockedExistsSync).toHaveBeenCalledWith(
        join('/dev/project', 'kiosk.config.json')
      );
    });

    it('should return defaults when config file has invalid JSON', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue('invalid json {{{');

      const config = loadConfig();

      // Should fall back to defaults
      expect(config.contentUrl).toBe('kiosk://renderer/index.html');
    });
  });

  describe('loadConfig (production mode)', () => {
    beforeEach(() => {
      Object.defineProperty(app, 'isPackaged', {
        value: true,
        writable: true,
        configurable: true,
      });
    });

    it('should fall back to bundled config when userData config not found', () => {
      mockGetPath.mockImplementation((name: string) => `/mock/${name}`);

      // userData config does NOT exist, bundled config exists
      mockedExistsSync.mockImplementation((path) => {
        if (path === join('/mock/userData', 'kiosk.config.json')) {
          return false;
        }
        if (path === join(MOCK_RESOURCES_PATH, 'kiosk.config.json')) {
          return true;
        }
        return false;
      });

      mockedReadFileSync.mockReturnValue(
        JSON.stringify({ devMode: true })
      );

      const config = loadConfig();

      expect(config.devMode).toBe(true);
    });

    it('should prefer userData config over bundled config in production', () => {
      mockGetPath.mockImplementation((name: string) => `/mock/${name}`);

      // userData config exists
      mockedExistsSync.mockImplementation((path) => {
        if (path === join('/mock/userData', 'kiosk.config.json')) {
          return true;
        }
        return false;
      });

      mockedReadFileSync.mockReturnValue(
        JSON.stringify({ kioskMode: true, width: 800 })
      );

      const config = loadConfig();

      expect(config.kioskMode).toBe(true);
      expect(config.width).toBe(800);
    });
  });

  describe('ensureConfigFile', () => {
    it('should create default config in development if not present', () => {
      mockGetAppPath.mockReturnValue('/dev/project');
      mockedExistsSync.mockReturnValue(false);

      ensureConfigFile();

      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        join('/dev/project', 'kiosk.config.json'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should not overwrite existing config in development', () => {
      mockedExistsSync.mockReturnValue(true);

      ensureConfigFile();

      expect(mockedWriteFileSync).not.toHaveBeenCalled();
    });

    it('should copy bundled config to userData in production', () => {
      Object.defineProperty(app, 'isPackaged', {
        value: true,
        writable: true,
        configurable: true,
      });

      mockGetPath.mockImplementation((name: string) => `/mock/${name}`);

      // userData config does not exist, bundled config exists
      mockedExistsSync.mockImplementation((path) => {
        if (path === join('/mock/userData', 'kiosk.config.json')) {
          return false;
        }
        if (path === join(MOCK_RESOURCES_PATH, 'kiosk.config.json')) {
          return true;
        }
        // userData directory does not exist
        return false;
      });

      mockedReadFileSync.mockReturnValue('{"devMode": false}');

      ensureConfigFile();

      // Should write to userData path
      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        join('/mock/userData', 'kiosk.config.json'),
        '{"devMode": false}',
        'utf-8'
      );
    });
  });

  describe('saveConfig', () => {
    it('should write config to file in development', () => {
      mockGetAppPath.mockReturnValue('/dev/project');
      // Directory exists
      mockedExistsSync.mockReturnValue(true);

      const config = getDefaultConfig();
      config.devMode = true;

      saveConfig(config);

      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        join('/dev/project', 'kiosk.config.json'),
        expect.stringContaining('"devMode": true'),
        'utf-8'
      );
    });
  });

  describe('generateCSP', () => {
    it('should generate CSP with base sources', () => {
      const csp = generateCSP();

      expect(csp).toContain("'self'");
      expect(csp).toContain('kiosk:');
    });

    it('should include whitelist domains', () => {
      const csp = generateCSP(['https://cdn.example.com', 'https://api.example.com']);

      expect(csp).toContain('https://cdn.example.com');
      expect(csp).toContain('https://api.example.com');
    });

    it('should include all required CSP directives', () => {
      const csp = generateCSP();

      expect(csp).toContain('default-src');
      expect(csp).toContain('script-src');
      expect(csp).toContain('style-src');
      expect(csp).toContain('img-src');
      expect(csp).toContain('font-src');
      expect(csp).toContain('connect-src');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return a copy of default config', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // different references
    });

    it('should have correct default contentUrl', () => {
      const config = getDefaultConfig();
      expect(config.contentUrl).toBe('kiosk://renderer/index.html');
    });
  });
});
