/**
 * Rate limiter unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRemainingCalls,
  getTimeUntilReset,
} from '../rate-limiter';
import { IPC_CHANNELS, RATE_LIMITS } from '../types';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetAllRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;

      // First call should be allowed
      expect(checkRateLimit(channel)).toBe(true);
    });

    it('should block requests exceeding rate limit', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;
      const config = RATE_LIMITS[channel];

      // Exhaust the rate limit
      for (let i = 0; i < config!.maxCalls; i++) {
        expect(checkRateLimit(channel)).toBe(true);
      }

      // Next call should be blocked
      expect(checkRateLimit(channel)).toBe(false);
    });

    it('should allow requests after window expires', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;
      const config = RATE_LIMITS[channel];

      // Exhaust the rate limit
      expect(checkRateLimit(channel)).toBe(true);
      expect(checkRateLimit(channel)).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(config!.windowMs + 1);

      // Should be allowed again
      expect(checkRateLimit(channel)).toBe(true);
    });

    it('should return true for channels without rate limit', () => {
      const channel = IPC_CHANNELS.GET_DEVICE_INFO;

      // No rate limit configured, should always allow
      for (let i = 0; i < 100; i++) {
        expect(checkRateLimit(channel)).toBe(true);
      }
    });

    it('should handle multiple channels independently', () => {
      const shutdownChannel = IPC_CHANNELS.SYSTEM_SHUTDOWN;
      const restartChannel = IPC_CHANNELS.SYSTEM_RESTART;

      // Exhaust shutdown limit
      expect(checkRateLimit(shutdownChannel)).toBe(true);
      expect(checkRateLimit(shutdownChannel)).toBe(false);

      // Restart should still be available
      expect(checkRateLimit(restartChannel)).toBe(true);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific channel', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;

      // Exhaust the rate limit
      expect(checkRateLimit(channel)).toBe(true);
      expect(checkRateLimit(channel)).toBe(false);

      // Reset
      resetRateLimit(channel);

      // Should be allowed again
      expect(checkRateLimit(channel)).toBe(true);
    });

    it('should not affect other channels', () => {
      const shutdownChannel = IPC_CHANNELS.SYSTEM_SHUTDOWN;
      const restartChannel = IPC_CHANNELS.SYSTEM_RESTART;

      // Exhaust both limits
      expect(checkRateLimit(shutdownChannel)).toBe(true);
      expect(checkRateLimit(restartChannel)).toBe(true);

      // Reset only shutdown
      resetRateLimit(shutdownChannel);

      // Shutdown should be allowed, restart still blocked
      expect(checkRateLimit(shutdownChannel)).toBe(true);
      expect(checkRateLimit(restartChannel)).toBe(false);
    });
  });

  describe('resetAllRateLimits', () => {
    it('should reset all rate limits', () => {
      const shutdownChannel = IPC_CHANNELS.SYSTEM_SHUTDOWN;
      const restartChannel = IPC_CHANNELS.SYSTEM_RESTART;

      // Exhaust both limits
      expect(checkRateLimit(shutdownChannel)).toBe(true);
      expect(checkRateLimit(restartChannel)).toBe(true);
      expect(checkRateLimit(shutdownChannel)).toBe(false);
      expect(checkRateLimit(restartChannel)).toBe(false);

      // Reset all
      resetAllRateLimits();

      // Both should be allowed again
      expect(checkRateLimit(shutdownChannel)).toBe(true);
      expect(checkRateLimit(restartChannel)).toBe(true);
    });
  });

  describe('getRemainingCalls', () => {
    it('should return max calls for fresh channel', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;
      const config = RATE_LIMITS[channel];

      expect(getRemainingCalls(channel)).toBe(config!.maxCalls);
    });

    it('should return remaining calls after some usage', () => {
      const channel = IPC_CHANNELS.OPEN_DEV_TOOLS;
      const config = RATE_LIMITS[channel];

      checkRateLimit(channel);
      checkRateLimit(channel);

      expect(getRemainingCalls(channel)).toBe(config!.maxCalls - 2);
    });

    it('should return 0 when exhausted', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;

      checkRateLimit(channel);

      expect(getRemainingCalls(channel)).toBe(0);
    });

    it('should return -1 for channels without rate limit', () => {
      const channel = IPC_CHANNELS.GET_DEVICE_INFO;

      expect(getRemainingCalls(channel)).toBe(-1);
    });
  });

  describe('getTimeUntilReset', () => {
    it('should return 0 for fresh channel', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;

      expect(getTimeUntilReset(channel)).toBe(0);
    });

    it('should return time until reset after rate limit hit', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;
      const config = RATE_LIMITS[channel];

      checkRateLimit(channel);

      // Should be approximately the window time
      const timeUntilReset = getTimeUntilReset(channel);
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(config!.windowMs);
    });

    it('should decrease over time', () => {
      const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;

      checkRateLimit(channel);

      const initialTime = getTimeUntilReset(channel);

      vi.advanceTimersByTime(10000);

      const laterTime = getTimeUntilReset(channel);

      expect(laterTime).toBeLessThan(initialTime);
    });

    it('should return 0 for channels without rate limit', () => {
      const channel = IPC_CHANNELS.GET_DEVICE_INFO;

      checkRateLimit(channel);

      expect(getTimeUntilReset(channel)).toBe(0);
    });
  });
});
