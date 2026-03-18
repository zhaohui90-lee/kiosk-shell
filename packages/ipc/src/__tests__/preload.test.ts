/**
 * Preload script unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Preload Script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete (globalThis as { document?: unknown }).document
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete (globalThis as { document?: unknown }).document
  });

  describe('Context Detection', () => {
    it('should not call exposeInMainWorld when contextBridge is undefined (main process)', async () => {
      const mockInstallVirtualKeyboardPlugin = vi.fn()

      // Mock electron with undefined contextBridge (simulates main process)
      vi.doMock('electron', () => ({
        contextBridge: undefined,
        ipcRenderer: {
          invoke: vi.fn(),
        },
      }));
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: mockInstallVirtualKeyboardPlugin,
      }))

      // Import preload - this should not throw even though contextBridge is undefined
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await expect(import('../preload')).resolves.toBeDefined();

      // Should not have logged success (because we skipped the call)
      expect(consoleSpy).not.toHaveBeenCalledWith('[Preload] shellAPI exposed successfully');

      // Should not have logged error
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockInstallVirtualKeyboardPlugin).not.toHaveBeenCalled()

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should call exposeInMainWorld when contextBridge is available (preload context)', async () => {
      const mockExposeInMainWorld = vi.fn();
      const mockInstallVirtualKeyboardPlugin = vi.fn()

      // Mock electron with valid contextBridge (simulates preload context)
      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: mockExposeInMainWorld,
        },
        ipcRenderer: {
          invoke: vi.fn(),
        },
      }));
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: mockInstallVirtualKeyboardPlugin,
      }))

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await import('../preload');

      // Should have called exposeInMainWorld
      expect(mockExposeInMainWorld).toHaveBeenCalledWith('shellAPI', expect.any(Object));

      // Should have logged success
      expect(consoleSpy).toHaveBeenCalledWith('[Preload] shellAPI exposed successfully');
      expect(mockInstallVirtualKeyboardPlugin).not.toHaveBeenCalled()

      consoleSpy.mockRestore();
    });

    it('should handle exposeInMainWorld failure gracefully', async () => {
      const mockExposeInMainWorld = vi.fn().mockImplementation(() => {
        throw new Error('Test error: already exposed');
      });
      const mockInstallVirtualKeyboardPlugin = vi.fn()

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: mockExposeInMainWorld,
        },
        ipcRenderer: {
          invoke: vi.fn(),
        },
      }));
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: mockInstallVirtualKeyboardPlugin,
      }))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw even if exposeInMainWorld fails
      await expect(import('../preload')).resolves.toBeDefined();

      // Should have logged the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Preload] Failed to expose shellAPI:',
        expect.any(Error)
      );
      expect(mockInstallVirtualKeyboardPlugin).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore();
    });

    it('should install ime virtual keyboard when document is available', async () => {
      const mockExposeInMainWorld = vi.fn()
      const mockInstallVirtualKeyboardPlugin = vi.fn()

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: mockExposeInMainWorld,
        },
        ipcRenderer: {
          invoke: vi.fn().mockResolvedValue(null),
          send: vi.fn(),
        },
      }))
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: mockInstallVirtualKeyboardPlugin,
      }))

      const documentStub = {
        addEventListener: vi.fn(),
      }
      ;(globalThis as { document?: unknown }).document = documentStub

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await import('../preload')
      // Flush pending microtasks so the async installImeVirtualKeyboard completes
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockInstallVirtualKeyboardPlugin).toHaveBeenCalledWith(
        expect.objectContaining({
          api: expect.objectContaining({
            imeSetSchema: expect.any(Function),
            imeProcessInput: expect.any(Function),
          }),
          defaultSchema: expect.any(String),
          candidatePageSize: expect.any(Number),
        }),
      )
      expect(consoleSpy).toHaveBeenCalledWith('[Preload] IME virtual keyboard installed')

      consoleSpy.mockRestore()
    })
  });

  describe('shellAPI methods', () => {
    it('should export shellAPI with all required methods', async () => {
      const mockInvoke = vi.fn();
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: vi.fn(),
      }))

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
      expect(typeof shellAPI.imeGetConfig).toBe('function');
      expect(typeof shellAPI.imeSetSchema).toBe('function');
      expect(typeof shellAPI.imeProcessInput).toBe('function');
      expect(typeof shellAPI.imeSelectCandidate).toBe('function');
      expect(typeof shellAPI.imeChangePage).toBe('function');
      expect(typeof shellAPI.imeSetOption).toBe('function');
      expect(typeof shellAPI.imeSetPageSize).toBe('function');
      expect(typeof shellAPI.imeDeploy).toBe('function');
      expect(typeof shellAPI.imeReset).toBe('function');
    });

    it('should call ipcRenderer.invoke for getDeviceInfo', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({ uuid: 'test-uuid' });
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: vi.fn(),
      }))

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
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: vi.fn(),
      }))

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn(),
        },
        ipcRenderer: {
          invoke: mockInvoke,
        },
      }));

      const { shellAPI } = await import('../preload');

      await expect(shellAPI.systemShutdown('session-token')).rejects.toThrow('Shutdown denied');
    });

    it('should throw error when systemRestart fails', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        success: false,
        message: 'Restart denied',
      });
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: vi.fn(),
      }))

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn(),
        },
        ipcRenderer: {
          invoke: mockInvoke,
        },
      }));

      const { shellAPI } = await import('../preload');

      await expect(shellAPI.systemRestart('session-token')).rejects.toThrow('Restart denied');
    });

    it('should call IME IPC channels correctly', async () => {
      const mockInvoke = vi.fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ state: 1, candidates: [] })
        .mockResolvedValueOnce('候选词')
        .mockResolvedValueOnce('page')
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
      vi.doMock('@kiosk/plugin-rime-renderer', () => ({
        installVirtualKeyboardPlugin: vi.fn(),
      }))

      vi.doMock('electron', () => ({
        contextBridge: {
          exposeInMainWorld: vi.fn(),
        },
        ipcRenderer: {
          invoke: mockInvoke,
        },
      }))

      const { shellAPI } = await import('../preload')

      await shellAPI.imeSetSchema('luna_pinyin')
      await shellAPI.imeProcessInput('ni')
      await shellAPI.imeSelectCandidate(0)
      await shellAPI.imeChangePage(true)
      await shellAPI.imeSetOption('ascii_mode', true)
      await shellAPI.imeSetPageSize(9)
      await shellAPI.imeDeploy()
      await shellAPI.imeReset()

      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'shell:imeSetSchema', 'luna_pinyin')
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'shell:imeProcessInput', 'ni')
      expect(mockInvoke).toHaveBeenNthCalledWith(3, 'shell:imeSelectCandidate', 0)
      expect(mockInvoke).toHaveBeenNthCalledWith(4, 'shell:imeChangePage', true)
      expect(mockInvoke).toHaveBeenNthCalledWith(5, 'shell:imeSetOption', 'ascii_mode', true)
      expect(mockInvoke).toHaveBeenNthCalledWith(6, 'shell:imeSetPageSize', 9)
      expect(mockInvoke).toHaveBeenNthCalledWith(7, 'shell:imeDeploy')
      expect(mockInvoke).toHaveBeenNthCalledWith(8, 'shell:imeReset')
    })
  });
});
