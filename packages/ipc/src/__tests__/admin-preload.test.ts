/**
 * Admin preload script unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Admin Preload Script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('Context Detection', () => {
    it('should not call exposeInMainWorld when contextBridge is undefined', async () => {
      vi.doMock('electron', () => ({
        contextBridge: undefined,
        ipcRenderer: { invoke: vi.fn() },
      }));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(import('../admin-preload')).resolves.toBeDefined();

      expect(consoleSpy).not.toHaveBeenCalledWith('[AdminPreload] adminAPI exposed successfully');
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should call exposeInMainWorld when contextBridge is available', async () => {
      const mockExposeInMainWorld = vi.fn();

      vi.doMock('electron', () => ({
        contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
        ipcRenderer: { invoke: vi.fn() },
      }));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await import('../admin-preload');

      expect(mockExposeInMainWorld).toHaveBeenCalledWith('adminAPI', expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('[AdminPreload] adminAPI exposed successfully');

      consoleSpy.mockRestore();
    });

    it('should handle exposeInMainWorld failure gracefully', async () => {
      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn().mockImplementation(() => {
            throw new Error('Test error: already exposed');
          }),
        },
        ipcRenderer: { invoke: vi.fn() },
      }));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(import('../admin-preload')).resolves.toBeDefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AdminPreload] Failed to expose adminAPI:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('adminAPI methods', () => {
    it('should export adminAPI with all required methods', async () => {
      vi.doMock('electron', () => ({
        contextBridge: { exposeInMainWorld: vi.fn() },
        ipcRenderer: { invoke: vi.fn() },
      }));

      const { adminAPI } = await import('../admin-preload');

      expect(adminAPI).toBeDefined();
      expect(typeof adminAPI.login).toBe('function');
      expect(typeof adminAPI.exitApp).toBe('function');
      expect(typeof adminAPI.restartApp).toBe('function');
      expect(typeof adminAPI.systemRestart).toBe('function');
      expect(typeof adminAPI.systemShutdown).toBe('function');
      expect(typeof adminAPI.getConfig).toBe('function');
      expect(typeof adminAPI.getSystemInfo).toBe('function');
      expect(typeof adminAPI.reloadBusiness).toBe('function');
    });

    it('should call ipcRenderer.invoke for login', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({ success: true, token: 'test-token' });

      vi.doMock('electron', () => ({
        contextBridge: { exposeInMainWorld: vi.fn() },
        ipcRenderer: { invoke: mockInvoke },
      }));

      const { adminAPI } = await import('../admin-preload');
      const result = await adminAPI.login('test-password');

      expect(mockInvoke).toHaveBeenCalledWith('shell:adminLogin', 'test-password');
      expect(result).toEqual({ success: true, token: 'test-token' });
    });

    it('should call ipcRenderer.invoke for exitApp', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({ success: true });

      vi.doMock('electron', () => ({
        contextBridge: { exposeInMainWorld: vi.fn() },
        ipcRenderer: { invoke: mockInvoke },
      }));

      const { adminAPI } = await import('../admin-preload');
      await adminAPI.exitApp('token-123');

      expect(mockInvoke).toHaveBeenCalledWith('shell:adminExitApp', 'token-123');
    });

    it('should call ipcRenderer.invoke for getSystemInfo', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        success: true,
        data: { platform: 'darwin' },
      });

      vi.doMock('electron', () => ({
        contextBridge: { exposeInMainWorld: vi.fn() },
        ipcRenderer: { invoke: mockInvoke },
      }));

      const { adminAPI } = await import('../admin-preload');
      const result = await adminAPI.getSystemInfo('token-123');

      expect(mockInvoke).toHaveBeenCalledWith('shell:adminGetSystemInfo', 'token-123');
      expect(result.data).toEqual({ platform: 'darwin' });
    });

    it('should call ipcRenderer.invoke for reloadBusiness', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({ success: true });

      vi.doMock('electron', () => ({
        contextBridge: { exposeInMainWorld: vi.fn() },
        ipcRenderer: { invoke: mockInvoke },
      }));

      const { adminAPI } = await import('../admin-preload');
      await adminAPI.reloadBusiness('token-123');

      expect(mockInvoke).toHaveBeenCalledWith('shell:adminReloadBusiness', 'token-123');
    });
  });
});
