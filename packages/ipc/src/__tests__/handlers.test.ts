/**
 * IPC handlers unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetAllRateLimits } from '../rate-limiter';

// Mock Electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    getVersion: vi.fn(() => '1.0.0'),
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

// Mock @kiosk/device
const mockDeviceUuid = '550e8400-e29b-41d4-a716-446655440000';
vi.mock('@kiosk/device', () => ({
  getDeviceUuidAsync: vi.fn().mockResolvedValue(mockDeviceUuid),
  isUuidManagerInitialized: vi.fn().mockReturnValue(true),
  initUuidManager: vi.fn().mockResolvedValue(undefined),
}));

// Mock @kiosk/platform
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
  blockShortcuts: vi.fn(),
  unblockShortcuts: vi.fn(),
  isKioskMode: vi.fn(() => false),
  enableKioskMode: vi.fn().mockResolvedValue(undefined),
  disableKioskMode: vi.fn().mockResolvedValue(undefined),
  openExternal: vi.fn().mockResolvedValue(undefined),
  getAppDataPath: vi.fn(() => '/tmp/kiosk-shell'),
  getUserDataPath: vi.fn(() => '/tmp/kiosk-shell'),
};

vi.mock('@kiosk/platform', () => ({
  getPlatformAdapter: vi.fn(() => mockPlatformAdapter),
}));

describe('IPC Handlers', () => {
  beforeEach(() => {
    resetAllRateLimits();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('System Handlers', () => {
    it('should handle shutdown request', async () => {
      const { handleSystemShutdown } = await import('../handlers/system');

      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handleSystemShutdown(mockEvent);

      expect(result.success).toBe(true);
      expect(mockPlatformAdapter.shutdown).toHaveBeenCalledWith({
        force: false,
        delay: 5,
      });
    });

    it('should handle restart request', async () => {
      const { handleSystemRestart } = await import('../handlers/system');

      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handleSystemRestart(mockEvent);

      expect(result.success).toBe(true);
      expect(mockPlatformAdapter.restart).toHaveBeenCalledWith({
        force: false,
        delay: 5,
      });
    });

    it('should rate limit shutdown requests', async () => {
      const { handleSystemShutdown } = await import('../handlers/system');

      const mockEvent = {} as Electron.IpcMainInvokeEvent;

      // First call should succeed
      const result1 = await handleSystemShutdown(mockEvent);
      expect(result1.success).toBe(true);

      // Second call should be rate limited
      const result2 = await handleSystemShutdown(mockEvent);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('rate limited');
    });

    it('should rate limit restart requests', async () => {
      const { handleSystemRestart } = await import('../handlers/system');

      const mockEvent = {} as Electron.IpcMainInvokeEvent;

      // First call should succeed
      const result1 = await handleSystemRestart(mockEvent);
      expect(result1.success).toBe(true);

      // Second call should be rate limited
      const result2 = await handleSystemRestart(mockEvent);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('rate limited');
    });

    it('should handle shutdown failure', async () => {
      mockPlatformAdapter.shutdown.mockRejectedValueOnce(new Error('Test error'));

      const { handleSystemShutdown } = await import('../handlers/system');

      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handleSystemShutdown(mockEvent);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Test error');
    });

    it('should register and unregister handlers', async () => {
      const { ipcMain } = await import('electron');
      const { registerSystemHandlers, unregisterSystemHandlers } = await import(
        '../handlers/system'
      );

      registerSystemHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'shell:systemShutdown',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'shell:systemRestart',
        expect.any(Function)
      );

      unregisterSystemHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:systemShutdown');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:systemRestart');
    });
  });

  describe('Device Handlers', () => {
    it('should return device info', async () => {
      const { handleGetDeviceInfo } = await import('../handlers/device');

      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handleGetDeviceInfo(mockEvent);

      expect(result).toMatchObject({
        platform: 'darwin',
        arch: 'arm64',
        hostname: 'test-machine',
        version: '1.0.0',
      });
      expect(result.uuid).toBe(mockDeviceUuid);
    });

    it('should return N/A uuid when UUID retrieval fails', async () => {
      const { getDeviceUuidAsync } = await import('@kiosk/device');
      (getDeviceUuidAsync as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('UUID storage failed')
      );

      const { handleGetDeviceInfo } = await import('../handlers/device');

      const mockEvent = {} as Electron.IpcMainInvokeEvent;
      const result = await handleGetDeviceInfo(mockEvent);

      // Should still return device info with N/A uuid instead of throwing
      expect(result.uuid).toBe('N/A');
      expect(result.platform).toBe('darwin');
      expect(result.arch).toBe('arm64');
      expect(result.hostname).toBe('test-machine');
    });

    it('should register and unregister handlers', async () => {
      const { ipcMain } = await import('electron');
      const { registerDeviceHandlers, unregisterDeviceHandlers } = await import(
        '../handlers/device'
      );

      registerDeviceHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'shell:getDeviceInfo',
        expect.any(Function)
      );

      unregisterDeviceHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:getDeviceInfo');
    });
  });

  describe('Debug Handlers', () => {
    it('should reject invalid password', async () => {
      const { handleOpenDevTools } = await import('../handlers/debug');

      const mockEvent = {
        sender: {},
      } as Electron.IpcMainInvokeEvent;

      const result = await handleOpenDevTools(mockEvent, 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid password');
    });

    it('should accept valid password', async () => {
      const { BrowserWindow } = await import('electron');
      const mockWebContents = {
        openDevTools: vi.fn(),
      };
      const mockWindow = {
        webContents: mockWebContents,
      };
      (BrowserWindow.fromWebContents as ReturnType<typeof vi.fn>).mockReturnValue(
        mockWindow
      );

      const { handleOpenDevTools } = await import('../handlers/debug');
      const { DEFAULT_DEBUG_PASSWORD } = await import('../constants');

      const mockEvent = {
        sender: {},
      } as Electron.IpcMainInvokeEvent;

      const result = await handleOpenDevTools(mockEvent, DEFAULT_DEBUG_PASSWORD);

      expect(result.success).toBe(true);
      expect(mockWebContents.openDevTools).toHaveBeenCalledWith({ mode: 'detach' });
    });

    it('should rate limit DevTools requests', async () => {
      const { handleOpenDevTools } = await import('../handlers/debug');

      const mockEvent = {
        sender: {},
      } as Electron.IpcMainInvokeEvent;

      // Exhaust rate limit (3 calls)
      for (let i = 0; i < 3; i++) {
        await handleOpenDevTools(mockEvent, 'wrong-password');
      }

      // Fourth call should be rate limited
      const result = await handleOpenDevTools(mockEvent, 'wrong-password');
      expect(result.success).toBe(false);
      expect(result.message).toContain('rate limited');
    });

    it('should allow custom password', async () => {
      const { BrowserWindow } = await import('electron');
      const mockWebContents = {
        openDevTools: vi.fn(),
      };
      const mockWindow = {
        webContents: mockWebContents,
      };
      (BrowserWindow.fromWebContents as ReturnType<typeof vi.fn>).mockReturnValue(
        mockWindow
      );

      const { handleOpenDevTools, setDebugPassword } = await import('../handlers/debug');

      // Set custom password
      setDebugPassword('my-secure-password');

      const mockEvent = {
        sender: {},
      } as Electron.IpcMainInvokeEvent;

      // Old password should fail
      const result1 = await handleOpenDevTools(mockEvent, 'kiosk-debug-2024');
      expect(result1.success).toBe(false);

      // New password should work (need to reset rate limit first)
      resetAllRateLimits();
      const result2 = await handleOpenDevTools(mockEvent, 'my-secure-password');
      expect(result2.success).toBe(true);
    });

    it('should register and unregister handlers', async () => {
      const { ipcMain } = await import('electron');
      const { registerDebugHandlers, unregisterDebugHandlers } = await import(
        '../handlers/debug'
      );

      registerDebugHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'shell:openDevTools',
        expect.any(Function)
      );

      unregisterDebugHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('shell:openDevTools');
    });
  });
});
