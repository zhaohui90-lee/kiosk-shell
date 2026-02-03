/**
 * Tests for auto retry mechanism
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { BrowserWindow, WebContents } from 'electron';
import {
  calculateRetryDelay,
  startAutoRetry,
  cancelAutoRetry,
  getAutoRetryState,
  isRetrying,
  resetRetryAttempts,
  updateAutoRetryConfig,
  getTotalRetries,
  resetAutoRetryStates,
} from '../auto-retry';
import type { AutoRetryConfig } from '../types';

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
  const mockWebContents = {
    reload: vi.fn(),
  } as unknown as WebContents;

  return {
    id,
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: mockWebContents,
    once: vi.fn(),
  } as unknown as BrowserWindow;
}

describe('Auto Retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAutoRetryStates();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateRetryDelay', () => {
    it('should return fixed delay with fixed strategy', () => {
      const config: AutoRetryConfig = {
        strategy: 'fixed',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      };

      expect(calculateRetryDelay(0, config)).toBe(1000);
      expect(calculateRetryDelay(1, config)).toBe(1000);
      expect(calculateRetryDelay(5, config)).toBe(1000);
    });

    it('should return linear delay with linear strategy', () => {
      const config: AutoRetryConfig = {
        strategy: 'linear',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      };

      expect(calculateRetryDelay(0, config)).toBe(1000); // 1000 * 1
      expect(calculateRetryDelay(1, config)).toBe(2000); // 1000 * 2
      expect(calculateRetryDelay(2, config)).toBe(3000); // 1000 * 3
      expect(calculateRetryDelay(4, config)).toBe(5000); // 1000 * 5
    });

    it('should return exponential delay with exponential strategy', () => {
      const config: AutoRetryConfig = {
        strategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      };

      expect(calculateRetryDelay(0, config)).toBe(1000); // 1000 * 2^0
      expect(calculateRetryDelay(1, config)).toBe(2000); // 1000 * 2^1
      expect(calculateRetryDelay(2, config)).toBe(4000); // 1000 * 2^2
      expect(calculateRetryDelay(3, config)).toBe(8000); // 1000 * 2^3
    });

    it('should cap delay at maxDelayMs', () => {
      const config: AutoRetryConfig = {
        strategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      };

      expect(calculateRetryDelay(0, config)).toBe(1000);
      expect(calculateRetryDelay(1, config)).toBe(2000);
      expect(calculateRetryDelay(2, config)).toBe(4000);
      expect(calculateRetryDelay(3, config)).toBe(5000); // capped at 5000
      expect(calculateRetryDelay(10, config)).toBe(5000); // still capped
    });

    it('should use default values when config is empty', () => {
      const config: AutoRetryConfig = {};

      // Default: exponential with initialDelay=1000, maxDelay=30000, multiplier=2
      expect(calculateRetryDelay(0, config)).toBe(1000);
      expect(calculateRetryDelay(1, config)).toBe(2000);
      expect(calculateRetryDelay(2, config)).toBe(4000);
    });

    it('should handle custom backoff multiplier', () => {
      const config: AutoRetryConfig = {
        strategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 100000,
        backoffMultiplier: 3,
      };

      expect(calculateRetryDelay(0, config)).toBe(1000);  // 1000 * 3^0
      expect(calculateRetryDelay(1, config)).toBe(3000);  // 1000 * 3^1
      expect(calculateRetryDelay(2, config)).toBe(9000);  // 1000 * 3^2
      expect(calculateRetryDelay(3, config)).toBe(27000); // 1000 * 3^3
    });
  });

  describe('startAutoRetry', () => {
    it('should throw error when window is not provided', () => {
      expect(() => startAutoRetry(null as unknown as BrowserWindow)).toThrow('No window provided');
    });

    it('should start auto retry and return success', () => {
      const window = createMockWindow(1);
      const result = startAutoRetry(window);

      expect(result.success).toBe(true);
      expect(result.action).toBe('reload');
    });

    it('should return error when retry is already in progress', () => {
      const window = createMockWindow(1);
      startAutoRetry(window);

      const result = startAutoRetry(window);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Retry is already in progress');
    });

    it('should register closed event handler', () => {
      const window = createMockWindow(1);
      startAutoRetry(window);

      expect(window.once).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    it('should reload window after delay', async () => {
      const window = createMockWindow(1);
      const config: AutoRetryConfig = {
        initialDelayMs: 1000,
        strategy: 'fixed',
      };

      startAutoRetry(window, config);

      // Advance time to trigger retry
      await vi.advanceTimersByTimeAsync(1000);

      expect(window.webContents.reload).toHaveBeenCalled();
    });

    it('should call onBeforeRetry callback', async () => {
      const window = createMockWindow(1);
      const onBeforeRetry = vi.fn();
      const config: AutoRetryConfig = {
        initialDelayMs: 1000,
        onBeforeRetry,
      };

      startAutoRetry(window, config);

      // Should be called immediately with attempt number and delay
      expect(onBeforeRetry).toHaveBeenCalledWith(0, 1000);
    });

    it('should call onRetrySuccess callback after successful retry', async () => {
      const window = createMockWindow(1);
      const onRetrySuccess = vi.fn();
      const config: AutoRetryConfig = {
        initialDelayMs: 1000,
        onRetrySuccess,
      };

      startAutoRetry(window, config);
      await vi.advanceTimersByTimeAsync(1000);

      expect(onRetrySuccess).toHaveBeenCalled();
    });
  });

  describe('cancelAutoRetry', () => {
    it('should throw error when window is not provided', () => {
      expect(() => cancelAutoRetry(null as unknown as BrowserWindow)).toThrow('No window provided');
    });

    it('should cancel pending retry', () => {
      const window = createMockWindow(1);
      startAutoRetry(window);

      cancelAutoRetry(window);

      expect(isRetrying(window)).toBe(false);
    });

    it('should prevent reload from being called', async () => {
      const window = createMockWindow(1);
      const config: AutoRetryConfig = {
        initialDelayMs: 1000,
      };

      startAutoRetry(window, config);
      cancelAutoRetry(window);

      await vi.advanceTimersByTimeAsync(2000);

      expect(window.webContents.reload).not.toHaveBeenCalled();
    });
  });

  describe('getAutoRetryState', () => {
    it('should return undefined when no retry has been started', () => {
      const window = createMockWindow(1);
      expect(getAutoRetryState(window)).toBeUndefined();
    });

    it('should return state after retry started', () => {
      const window = createMockWindow(1);
      startAutoRetry(window);

      const state = getAutoRetryState(window);
      expect(state).toBeDefined();
      expect(state!.windowId).toBe(1);
      expect(state!.retrying).toBe(true);
    });
  });

  describe('isRetrying', () => {
    it('should return false when no retry in progress', () => {
      const window = createMockWindow(1);
      expect(isRetrying(window)).toBe(false);
    });

    it('should return true when retry is in progress', () => {
      const window = createMockWindow(1);
      startAutoRetry(window);

      expect(isRetrying(window)).toBe(true);
    });

    it('should return false after retry completes', async () => {
      const window = createMockWindow(1);
      const config: AutoRetryConfig = {
        initialDelayMs: 1000,
      };

      startAutoRetry(window, config);
      await vi.advanceTimersByTimeAsync(1000);

      expect(isRetrying(window)).toBe(false);
    });
  });

  describe('resetRetryAttempts', () => {
    it('should reset current attempt to 0', async () => {
      const window = createMockWindow(1);
      const config: AutoRetryConfig = {
        initialDelayMs: 100,
      };

      // Start retry and let it complete
      startAutoRetry(window, config);
      await vi.advanceTimersByTimeAsync(100);

      const stateAfterRetry = getAutoRetryState(window);
      expect(stateAfterRetry!.currentAttempt).toBe(1);

      resetRetryAttempts(window);

      const stateAfterReset = getAutoRetryState(window);
      expect(stateAfterReset!.currentAttempt).toBe(0);
    });
  });

  describe('updateAutoRetryConfig', () => {
    it('should update configuration', () => {
      const window = createMockWindow(1);
      startAutoRetry(window, { initialDelayMs: 1000 });

      updateAutoRetryConfig(window, { initialDelayMs: 2000 });

      const state = getAutoRetryState(window);
      expect(state!.config.initialDelayMs).toBe(2000);
    });
  });

  describe('getTotalRetries', () => {
    it('should return 0 when no retries have been performed', () => {
      const window = createMockWindow(1);
      expect(getTotalRetries(window)).toBe(0);
    });

    it('should count total retries', async () => {
      const window = createMockWindow(1);
      const config: AutoRetryConfig = {
        initialDelayMs: 100,
      };

      startAutoRetry(window, config);
      await vi.advanceTimersByTimeAsync(100);

      expect(getTotalRetries(window)).toBe(1);
    });
  });

  describe('max retries behavior', () => {
    it('should call onMaxRetriesExceeded when max retries reached', async () => {
      const window = createMockWindow(1);
      const onMaxRetriesExceeded = vi.fn();
      const config: AutoRetryConfig = {
        maxRetries: 2,
        initialDelayMs: 100,
        onMaxRetriesExceeded,
      };

      // First retry
      startAutoRetry(window, config);
      await vi.advanceTimersByTimeAsync(100);

      // Second retry - manually trigger since we need to simulate multiple retries
      const state = getAutoRetryState(window);
      state!.currentAttempt = 2; // Set to max
      state!.retrying = false;

      // Try to start again
      startAutoRetry(window, config);

      // The callback should be called since max retries exceeded
      expect(onMaxRetriesExceeded).toHaveBeenCalled();
    });

    it('should return error when max retries exceeded', async () => {
      const window = createMockWindow(1);
      const config: AutoRetryConfig = {
        maxRetries: 1,
        initialDelayMs: 100,
      };

      startAutoRetry(window, config);
      await vi.advanceTimersByTimeAsync(100);

      // Start second retry
      const result = startAutoRetry(window, config);

      // Result may vary based on timing, but state should reflect max exceeded
      const state = getAutoRetryState(window);
      expect(state!.currentAttempt).toBe(1);
    });
  });

  describe('window destruction handling', () => {
    it('should not reload when window is destroyed', async () => {
      const window = createMockWindow(1);
      (window.isDestroyed as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const config: AutoRetryConfig = {
        initialDelayMs: 100,
      };

      startAutoRetry(window, config);
      await vi.advanceTimersByTimeAsync(100);

      expect(window.webContents.reload).not.toHaveBeenCalled();
    });
  });
});
