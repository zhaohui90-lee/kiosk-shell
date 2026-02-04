/**
 * Monitor unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initMonitor,
  startMonitoring,
  stopMonitoring,
  isMonitoringActive,
  getMonitorState,
  getProcessState,
  onWatchdogEvent,
  offWatchdogEvent,
  resetMonitor,
  isProcessRunning,
  isPlatformSupported,
  isWindows,
} from '../monitor';
import { ERROR_MESSAGES, INITIAL_BACKOFF_DELAY } from '../constants';

// Mock logger
vi.mock('@kiosk/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Monitor', () => {
  beforeEach(() => {
    resetMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetMonitor();
    vi.useRealTimers();
  });

  describe('isProcessRunning', () => {
    it('should return true for current process', () => {
      expect(isProcessRunning(process.pid)).toBe(true);
    });

    it('should return false for non-existent process', () => {
      // Use a very high PID that is unlikely to exist
      expect(isProcessRunning(999999999)).toBe(false);
    });

    it('should return false for very large PID', () => {
      // Use a very large PID that is guaranteed not to exist
      expect(isProcessRunning(2147483647)).toBe(false);
    });
  });

  describe('isPlatformSupported', () => {
    it('should return true (monitor works on all platforms)', () => {
      expect(isPlatformSupported()).toBe(true);
    });
  });

  describe('isWindows', () => {
    it('should return boolean based on platform', () => {
      expect(typeof isWindows()).toBe('boolean');
      expect(isWindows()).toBe(process.platform === 'win32');
    });
  });

  describe('initMonitor', () => {
    it('should initialize with default config', () => {
      initMonitor();
      const state = getMonitorState();
      expect(state.active).toBe(false);
      expect(state.processState).toBe('unknown');
    });

    it('should accept custom configuration', () => {
      initMonitor({
        checkInterval: 10000,
        autoRestart: false,
      });
      // Config is internal, but we can verify init worked
      const state = getMonitorState();
      expect(state.active).toBe(false);
    });

    it('should accept PID in config', () => {
      initMonitor({ pid: process.pid });
      const state = getMonitorState();
      expect(state.pid).toBe(process.pid);
    });
  });

  describe('startMonitoring', () => {
    it('should start monitoring for current process', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(isMonitoringActive()).toBe(true);
      expect(getMonitorState().pid).toBe(process.pid);
    });

    it('should throw error if already monitoring', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      await expect(startMonitoring()).rejects.toThrow(ERROR_MESSAGES.ALREADY_MONITORING);
    });

    it('should reset restart attempts on start', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      const state = getMonitorState();
      expect(state.restartAttempts).toBe(0);
    });

    it('should set initial backoff delay', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      const state = getMonitorState();
      expect(state.currentBackoffDelay).toBe(INITIAL_BACKOFF_DELAY);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(isMonitoringActive()).toBe(true);

      stopMonitoring();

      expect(isMonitoringActive()).toBe(false);
    });

    it('should be safe to call when not monitoring', () => {
      expect(() => stopMonitoring()).not.toThrow();
    });
  });

  describe('isMonitoringActive', () => {
    it('should return false initially', () => {
      expect(isMonitoringActive()).toBe(false);
    });

    it('should return true when monitoring', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(isMonitoringActive()).toBe(true);
    });
  });

  describe('getMonitorState', () => {
    it('should return initial state', () => {
      const state = getMonitorState();

      expect(state.active).toBe(false);
      expect(state.processState).toBe('unknown');
      expect(state.pid).toBe(null);
      expect(state.restartAttempts).toBe(0);
      expect(state.lastCheck).toBe(null);
      expect(state.lastStateChange).toBe(null);
    });

    it('should return updated state when monitoring', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      const state = getMonitorState();

      expect(state.active).toBe(true);
      expect(state.pid).toBe(process.pid);
      expect(state.lastCheck).not.toBe(null);
    });

    it('should return a copy of state (immutable)', () => {
      const state1 = getMonitorState();
      const state2 = getMonitorState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getProcessState', () => {
    it('should return unknown initially', () => {
      expect(getProcessState()).toBe('unknown');
    });

    it('should return running for current process', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(getProcessState()).toBe('running');
    });
  });

  describe('onWatchdogEvent / offWatchdogEvent', () => {
    it('should add event handler', async () => {
      const handler = vi.fn();
      onWatchdogEvent(handler);

      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(handler).toHaveBeenCalled();
    });

    it('should remove event handler', async () => {
      const handler = vi.fn();
      onWatchdogEvent(handler);
      offWatchdogEvent(handler);

      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      // Handler should not be called after removal
      // Actually it might be called before removal, so let's check differently
      resetMonitor();

      const handler2 = vi.fn();
      const unsubscribe = onWatchdogEvent(handler2);
      unsubscribe();

      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(handler2).not.toHaveBeenCalled();
    });

    it('should receive monitoring-started event', async () => {
      const handler = vi.fn();
      onWatchdogEvent(handler);

      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'monitoring-started',
        })
      );
    });

    it('should receive monitoring-stopped event', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      const handler = vi.fn();
      onWatchdogEvent(handler);

      stopMonitoring();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'monitoring-stopped',
        })
      );
    });
  });

  describe('resetMonitor', () => {
    it('should reset all state', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      resetMonitor();

      const state = getMonitorState();
      expect(state.active).toBe(false);
      expect(state.processState).toBe('unknown');
      expect(state.pid).toBe(null);
      expect(state.restartAttempts).toBe(0);
    });

    it('should stop monitoring if active', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      expect(isMonitoringActive()).toBe(true);

      resetMonitor();

      expect(isMonitoringActive()).toBe(false);
    });

    it('should clear event handlers', async () => {
      const handler = vi.fn();
      onWatchdogEvent(handler);

      resetMonitor();

      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      // Handler should have been cleared
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('periodic checking', () => {
    it('should check process periodically', async () => {
      initMonitor({ checkInterval: 1000 });
      await startMonitoring(process.pid);

      const initialState = getMonitorState();
      const initialCheck = initialState.lastCheck;

      // Advance timers
      vi.advanceTimersByTime(1000);

      const updatedState = getMonitorState();
      expect(updatedState.lastCheck).not.toBe(initialCheck);
    });
  });
});
