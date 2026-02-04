/**
 * Preload script unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Preload Script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('Context Detection', () => {
    it('should not call exposeInMainWorld when contextBridge is undefined (main process)', async () => {
      // Mock electron with undefined contextBridge (simulates main process)
      vi.doMock('electron', () => ({
        contextBridge: undefined,
        ipcRenderer: {
          invoke: vi.fn(),
        },
      }));

      // Import preload - this should not throw even though contextBridge is undefined
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await expect(import('../preload')).resolves.toBeDefined();

      // Should not have logged success (because we skipped the call)
      expect(consoleSpy).not.toHaveBeenCalledWith('[Preload] shellAPI exposed successfully');

      // Should not have logged error
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should call exposeInMainWorld when contextBridge is available (preload context)', async () => {
      const mockExposeInMainWorld = vi.fn();

      // Mock electron with valid contextBridge (simulates preload context)
      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: mockExposeInMainWorld,
        },
        ipcRenderer: {
          invoke: vi.fn(),
        },
      }));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await import('../preload');

      // Should have called exposeInMainWorld
      expect(mockExposeInMainWorld).toHaveBeenCalledWith('shellAPI', expect.any(Object));

      // Should have logged success
      expect(consoleSpy).toHaveBeenCalledWith('[Preload] shellAPI exposed successfully');

      consoleSpy.mockRestore();
    });

    it('should handle exposeInMainWorld failure gracefully', async () => {
      const mockExposeInMainWorld = vi.fn().mockImplementation(() => {
        throw new Error('Test error: already exposed');
      });

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: mockExposeInMainWorld,
        },
        ipcRenderer: {
          invoke: vi.fn(),
        },
      }));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw even if exposeInMainWorld fails
      await expect(import('../preload')).resolves.toBeDefined();

      // Should have logged the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Preload] Failed to expose shellAPI:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('shellAPI methods', () => {
    it('should export shellAPI with all required methods', async () => {
      const mockInvoke = vi.fn();

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn(),
        },
        ipcRenderer: {
          invoke: mockInvoke,
        },
      }));

      const { shellAPI } = await import('../preload');

      expect(shellAPI).toBeDefined();
      expect(typeof shellAPI.getDeviceInfo).toBe('function');
      expect(typeof shellAPI.requestUpdate).toBe('function');
      expect(typeof shellAPI.systemShutdown).toBe('function');
      expect(typeof shellAPI.systemRestart).toBe('function');
      expect(typeof shellAPI.openDevTools).toBe('function');
    });

    it('should call ipcRenderer.invoke for getDeviceInfo', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({ uuid: 'test-uuid' });

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn(),
        },
        ipcRenderer: {
          invoke: mockInvoke,
        },
      }));

      const { shellAPI } = await import('../preload');
      const result = await shellAPI.getDeviceInfo();

      expect(mockInvoke).toHaveBeenCalledWith('shell:getDeviceInfo');
      expect(result).toEqual({ uuid: 'test-uuid' });
    });

    it('should throw error when systemShutdown fails', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        success: false,
        message: 'Shutdown denied',
      });

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn(),
        },
        ipcRenderer: {
          invoke: mockInvoke,
        },
      }));

      const { shellAPI } = await import('../preload');

      await expect(shellAPI.systemShutdown()).rejects.toThrow('Shutdown denied');
    });

    it('should throw error when systemRestart fails', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        success: false,
        message: 'Restart denied',
      });

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn(),
        },
        ipcRenderer: {
          invoke: mockInvoke,
        },
      }));

      const { shellAPI } = await import('../preload');

      await expect(shellAPI.systemRestart()).rejects.toThrow('Restart denied');
    });
  });
});
