/**
 * Admin IPC handlers unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetAllRateLimits } from '../rate-limiter';

// Hoisted mocks (vi.mock factories are hoisted, so variables must be too)
const { mockQuit, mockRelaunch, mockReload, mockPlatformAdapter } = vi.hoisted(() => {
  const mockQuit = vi.fn();
  const mockRelaunch = vi.fn();
  const mockReload = vi.fn();
  const mockPlatformAdapter = {
    getPlatform: vi.fn(() => 'darwin'),
    getSystemInfo: vi.fn(() => ({
      platform: 'darwin' as const,
      arch: 'arm64',
      hostname: 'test-machine',
      release: '14.0.0',
      totalMemory: 17179869184,
      freeMemory: 8589934592,
      cpuCount: 8,
    })),
    shutdown: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),
  };
  return { mockQuit, mockRelaunch, mockReload, mockPlatformAdapter };
});

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => 'mock-session-token-abc123'),
  })),
}));

// Mock Electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    quit: mockQuit,
    relaunch: mockRelaunch,
    getVersion: vi.fn(() => '1.0.0'),
    isPackaged: false,
    getLocale: vi.fn(() => 'en-US'),
    getAppPath: vi.fn(() => '/test/app'),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}));

// Mock @kiosk/logger
vi.mock('@kiosk/logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock @kiosk/platform
vi.mock('@kiosk/platform', () => ({
  getPlatformAdapter: vi.fn(() => mockPlatformAdapter),
}));

// Import the module under test (after mocks are set up)
import {
  handleAdminLogin,
  handleAdminExitApp,
  handleAdminRestartApp,
  handleAdminSystemRestart,
  handleAdminSystemShutdown,
  handleAdminGetConfig,
  handleAdminGetSystemInfo,
  handleAdminReloadBusiness,
  registerAdminHandlers,
  unregisterAdminHandlers,
  setAdminPassword,
  setMainWindowRef,
  invalidateSession,
} from '../handlers/admin';
import { DEFAULT_ADMIN_PASSWORD } from '../constants';

describe('Admin IPC Handlers', () => {
  const mockEvent = {} as Electron.IpcMainInvokeEvent;

  beforeEach(() => {
    resetAllRateLimits();
    vi.clearAllMocks();
    // Reset to default password and clear session before each test
    setAdminPassword(DEFAULT_ADMIN_PASSWORD);
    invalidateSession();
    setMainWindowRef(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAdminLogin', () => {
    it('should reject invalid password', async () => {
      const result = await handleAdminLogin(mockEvent, 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid password');
      expect(result.token).toBeUndefined();
    });

    it('should accept valid default password', async () => {
      const result = await handleAdminLogin(mockEvent, DEFAULT_ADMIN_PASSWORD);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token).toBe('mock-session-token-abc123');
    });

    it('should rate limit login attempts', async () => {
      // Exhaust rate limit (5 calls)
      for (let i = 0; i < 5; i++) {
        await handleAdminLogin(mockEvent, 'wrong');
      }

      // 6th call should be rate limited
      const result = await handleAdminLogin(mockEvent, 'wrong');
      expect(result.success).toBe(false);
      expect(result.message).toContain('rate limited');
    });

    it('should allow custom password via setAdminPassword', async () => {
      setAdminPassword('my-admin-pass');

      // Default password should fail
      const result1 = await handleAdminLogin(mockEvent, DEFAULT_ADMIN_PASSWORD);
      expect(result1.success).toBe(false);

      // Custom password should succeed
      const result2 = await handleAdminLogin(mockEvent, 'my-admin-pass');
      expect(result2.success).toBe(true);
      expect(result2.token).toBeDefined();
    });

    it('should reject short password in setAdminPassword', async () => {
      setAdminPassword('short'); // Too short, should be ignored

      // Default password should still work
      const result = await handleAdminLogin(mockEvent, DEFAULT_ADMIN_PASSWORD);
      expect(result.success).toBe(true);
    });
  });

  describe('Token-protected operations', () => {
    const validToken = 'mock-session-token-abc123';

    beforeEach(async () => {
      // Login to get a valid session token
      resetAllRateLimits();
      await handleAdminLogin(mockEvent, DEFAULT_ADMIN_PASSWORD);
    });

    it('should reject operations with invalid token', async () => {
      const result = await handleAdminExitApp(mockEvent, 'invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or expired session token');
    });

    it('should handle exit app with valid token', async () => {
      const result = await handleAdminExitApp(mockEvent, validToken);

      expect(result.success).toBe(true);
      expect(mockQuit).toHaveBeenCalled();
    });

    it('should handle restart app with valid token', async () => {
      const result = await handleAdminRestartApp(mockEvent, validToken);

      expect(result.success).toBe(true);
      expect(mockRelaunch).toHaveBeenCalled();
      expect(mockQuit).toHaveBeenCalled();
    });

    it('should handle system restart with valid token', async () => {
      const result = await handleAdminSystemRestart(mockEvent, validToken);

      expect(result.success).toBe(true);
      expect(mockPlatformAdapter.restart).toHaveBeenCalledWith({ force: false, delay: 5 });
    });

    it('should handle system shutdown with valid token', async () => {
      const result = await handleAdminSystemShutdown(mockEvent, validToken);

      expect(result.success).toBe(true);
      expect(mockPlatformAdapter.shutdown).toHaveBeenCalledWith({ force: false, delay: 5 });
    });

    it('should handle system restart failure', async () => {
      mockPlatformAdapter.restart.mockRejectedValueOnce(new Error('Restart failed'));

      const result = await handleAdminSystemRestart(mockEvent, validToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Restart failed');
    });

    it('should handle system shutdown failure', async () => {
      mockPlatformAdapter.shutdown.mockRejectedValueOnce(new Error('Shutdown failed'));

      const result = await handleAdminSystemShutdown(mockEvent, validToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Shutdown failed');
    });

    it('should return config info with valid token', async () => {
      const result = await handleAdminGetConfig(mockEvent, validToken);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!['version']).toBe('1.0.0');
      expect(result.data!['isPackaged']).toBe(false);
    });

    it('should return system info with valid token', async () => {
      const result = await handleAdminGetSystemInfo(mockEvent, validToken);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!['platform']).toBe('darwin');
      expect(result.data!['arch']).toBe('arm64');
      expect(result.data!['hostname']).toBe('test-machine');
      expect(result.data!['appVersion']).toBe('1.0.0');
    });

    it('should reload business page with valid token', async () => {
      const mockWindow = {
        isDestroyed: vi.fn(() => false),
        webContents: { reload: mockReload },
      } as unknown as Electron.BrowserWindow;

      setMainWindowRef(mockWindow);

      const result = await handleAdminReloadBusiness(mockEvent, validToken);

      expect(result.success).toBe(true);
      expect(mockReload).toHaveBeenCalled();
    });

    it('should fail reload when main window is not available', async () => {
      setMainWindowRef(null);

      const result = await handleAdminReloadBusiness(mockEvent, validToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Main window not available');
    });

    it('should fail reload when main window is destroyed', async () => {
      const mockWindow = {
        isDestroyed: vi.fn(() => true),
        webContents: { reload: mockReload },
      } as unknown as Electron.BrowserWindow;

      setMainWindowRef(mockWindow);

      const result = await handleAdminReloadBusiness(mockEvent, validToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Main window not available');
    });

    it('should invalidate session', async () => {
      invalidateSession();

      const result = await handleAdminExitApp(mockEvent, validToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or expired session token');
    });
  });

  describe('Handler registration', () => {
    it('should register all admin handlers', async () => {
      const { ipcMain } = await import('electron');

      registerAdminHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminLogin', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminExitApp', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminRestartApp', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminSystemRestart', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminSystemShutdown', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminGetConfig', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminGetSystemInfo', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('shell:adminReloadBusiness', expect.any(Function));
    });

    it('should unregister all admin handlers', async () => {
      const { ipcMain } = await import('electron');

      unregisterAdminHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminLogin');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminExitApp');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminRestartApp');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminSystemRestart');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminSystemShutdown');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminGetConfig');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminGetSystemInfo');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:adminReloadBusiness');
    });
  });
});
