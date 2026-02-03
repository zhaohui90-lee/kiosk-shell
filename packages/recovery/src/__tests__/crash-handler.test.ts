/**
 * Tests for crash handler
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { BrowserWindow, WebContents } from 'electron';
import {
  isRestartableCrash,
  startCrashMonitoring,
  stopCrashMonitoring,
  getCrashHandlerState,
  getRecentCrashes,
  clearCrashHistory,
  updateCrashHandlerConfig,
  triggerCrashRecovery,
  resetCrashHandlerStates,
} from '../crash-handler';
import type { CrashHandlerConfig } from '../types';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock BrowserWindow
function createMockWindow(id: number): BrowserWindow {
  const eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};

  const mockWebContents = {
    reload: vi.fn(),
    getURL: vi.fn().mockReturnValue('https://example.com'),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    removeAllListeners: vi.fn((event: string) => {
      eventHandlers[event] = [];
    }),
  } as unknown as WebContents;

  const window = {
    id,
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: mockWebContents,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    // Helper to emit events for testing
    _emit: (event: string, ...args: unknown[]) => {
      const handlers = eventHandlers[event] || [];
      handlers.forEach((h) => h(...args));
    },
    _emitWebContentsEvent: (event: string, ...args: unknown[]) => {
      const handlers = eventHandlers[event] || [];
      handlers.forEach((h) => h(...args));
    },
  } as unknown as BrowserWindow & {
    _emit: (event: string, ...args: unknown[]) => void;
    _emitWebContentsEvent: (event: string, ...args: unknown[]) => void;
  };

  return window;
}

describe('Crash Handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetCrashHandlerStates();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isRestartableCrash', () => {
    it('should return true for crashed reason', () => {
      expect(isRestartableCrash('crashed')).toBe(true);
    });

    it('should return true for oom reason', () => {
      expect(isRestartableCrash('oom')).toBe(true);
    });

    it('should return true for abnormal-exit reason', () => {
      expect(isRestartableCrash('abnormal-exit')).toBe(true);
    });

    it('should return false for normal-exit reason', () => {
      expect(isRestartableCrash('normal-exit')).toBe(false);
    });

    it('should return false for killed reason', () => {
      expect(isRestartableCrash('killed')).toBe(false);
    });

    it('should return false for launch-failed reason', () => {
      expect(isRestartableCrash('launch-failed')).toBe(false);
    });

    it('should return false for integrity-failure reason', () => {
      expect(isRestartableCrash('integrity-failure')).toBe(false);
    });
  });

  describe('startCrashMonitoring', () => {
    it('should throw error when window is not provided', () => {
      expect(() => startCrashMonitoring(null as unknown as BrowserWindow)).toThrow(
        'No window provided'
      );
    });

    it('should start monitoring and return state', () => {
      const window = createMockWindow(1);
      const state = startCrashMonitoring(window);

      expect(state).toBeDefined();
      expect(state.windowId).toBe(1);
      expect(state.active).toBe(true);
      expect(state.crashes).toEqual([]);
    });

    it('should return existing state if already monitoring', () => {
      const window = createMockWindow(1);
      const state1 = startCrashMonitoring(window);
      const state2 = startCrashMonitoring(window);

      expect(state1).toBe(state2);
    });

    it('should register render-process-gone event handler', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      expect(window.webContents.on).toHaveBeenCalledWith(
        'render-process-gone',
        expect.any(Function)
      );
    });

    it('should register closed event handler', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      expect(window.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    it('should use provided config', () => {
      const window = createMockWindow(1);
      const config: CrashHandlerConfig = {
        autoRestart: false,
        maxRestarts: 5,
      };

      const state = startCrashMonitoring(window, config);

      expect(state.config.autoRestart).toBe(false);
      expect(state.config.maxRestarts).toBe(5);
    });
  });

  describe('stopCrashMonitoring', () => {
    it('should throw error when window is not provided', () => {
      expect(() => stopCrashMonitoring(null as unknown as BrowserWindow)).toThrow(
        'No window provided'
      );
    });

    it('should mark monitoring as inactive', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);
      stopCrashMonitoring(window);

      const state = getCrashHandlerState(window);
      expect(state!.active).toBe(false);
    });

    it('should do nothing if not monitoring', () => {
      const window = createMockWindow(1);
      // Should not throw
      expect(() => stopCrashMonitoring(window)).not.toThrow();
    });
  });

  describe('getCrashHandlerState', () => {
    it('should return undefined when not monitoring', () => {
      const window = createMockWindow(1);
      expect(getCrashHandlerState(window)).toBeUndefined();
    });

    it('should return state when monitoring', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      const state = getCrashHandlerState(window);
      expect(state).toBeDefined();
      expect(state!.windowId).toBe(1);
    });
  });

  describe('getRecentCrashes', () => {
    it('should return empty array when not monitoring', () => {
      const window = createMockWindow(1);
      expect(getRecentCrashes(window)).toEqual([]);
    });

    it('should return crashes within time window', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      // Trigger a crash
      triggerCrashRecovery(window, 'crashed');

      const crashes = getRecentCrashes(window);
      expect(crashes.length).toBe(1);
      expect(crashes[0]!.reason).toBe('crashed');
    });

    it('should not return crashes outside time window', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window, { restartWindowMs: 1000 });

      // Trigger a crash
      triggerCrashRecovery(window, 'crashed');

      // Advance time beyond window
      vi.advanceTimersByTime(2000);

      const crashes = getRecentCrashes(window);
      expect(crashes.length).toBe(0);
    });
  });

  describe('clearCrashHistory', () => {
    it('should clear all crash history', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      triggerCrashRecovery(window, 'crashed');
      triggerCrashRecovery(window, 'oom');

      clearCrashHistory(window);

      const state = getCrashHandlerState(window);
      expect(state!.crashes).toEqual([]);
    });
  });

  describe('updateCrashHandlerConfig', () => {
    it('should update configuration', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      updateCrashHandlerConfig(window, { autoRestart: false });

      const state = getCrashHandlerState(window);
      expect(state!.config.autoRestart).toBe(false);
    });

    it('should merge with existing config', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window, { maxRestarts: 5 });

      updateCrashHandlerConfig(window, { autoRestart: false });

      const state = getCrashHandlerState(window);
      expect(state!.config.autoRestart).toBe(false);
      expect(state!.config.maxRestarts).toBe(5);
    });
  });

  describe('triggerCrashRecovery', () => {
    it('should return error when not monitoring', () => {
      const window = createMockWindow(1);
      const result = triggerCrashRecovery(window);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Monitoring is not active');
    });

    it('should add crash to history', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      triggerCrashRecovery(window, 'crashed');

      const state = getCrashHandlerState(window);
      expect(state!.crashes.length).toBe(1);
    });

    it('should call onCrash callback', () => {
      const window = createMockWindow(1);
      const onCrash = vi.fn();
      startCrashMonitoring(window, { onCrash });

      triggerCrashRecovery(window, 'crashed');

      expect(onCrash).toHaveBeenCalledWith(
        expect.objectContaining({
          windowId: 1,
          reason: 'crashed',
        })
      );
    });

    it('should schedule reload when autoRestart is true', async () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window, { autoRestart: true, restartDelayMs: 100 });

      triggerCrashRecovery(window, 'crashed');

      await vi.advanceTimersByTimeAsync(100);

      expect(window.webContents.reload).toHaveBeenCalled();
    });

    it('should not reload when autoRestart is false', async () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window, { autoRestart: false });

      triggerCrashRecovery(window, 'crashed');

      await vi.advanceTimersByTimeAsync(2000);

      expect(window.webContents.reload).not.toHaveBeenCalled();
    });

    it('should not reload for non-restartable crash reasons', async () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window, { autoRestart: true, restartDelayMs: 100 });

      triggerCrashRecovery(window, 'normal-exit');

      await vi.advanceTimersByTimeAsync(100);

      expect(window.webContents.reload).not.toHaveBeenCalled();
    });

    it('should call onMaxRestartsExceeded when max restarts exceeded', () => {
      const window = createMockWindow(1);
      const onMaxRestartsExceeded = vi.fn();
      startCrashMonitoring(window, {
        autoRestart: true,
        maxRestarts: 2,
        restartWindowMs: 60000,
        onMaxRestartsExceeded,
      });

      // Trigger multiple crashes
      triggerCrashRecovery(window, 'crashed');
      triggerCrashRecovery(window, 'crashed');
      triggerCrashRecovery(window, 'crashed');

      expect(onMaxRestartsExceeded).toHaveBeenCalled();
    });

    it('should return max restarts exceeded error', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window, {
        autoRestart: true,
        maxRestarts: 1,
        restartWindowMs: 60000,
      });

      triggerCrashRecovery(window, 'crashed');
      const result = triggerCrashRecovery(window, 'crashed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Maximum restart attempts exceeded');
    });
  });

  describe('crash event handling', () => {
    it('should store URL of crashed page', () => {
      const window = createMockWindow(1);
      (window.webContents.getURL as ReturnType<typeof vi.fn>).mockReturnValue('https://test.com/page');
      startCrashMonitoring(window);

      triggerCrashRecovery(window, 'crashed');

      const state = getCrashHandlerState(window);
      expect(state!.crashes[0]!.url).toBe('https://test.com/page');
    });

    it('should record exit code', () => {
      const window = createMockWindow(1);
      startCrashMonitoring(window);

      triggerCrashRecovery(window, 'crashed');

      const state = getCrashHandlerState(window);
      expect(state!.crashes[0]!.exitCode).toBe(1); // triggerCrashRecovery uses exitCode 1
    });
  });
});
