/**
 * Rate limiter unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  RateLimiter,
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRemainingCalls,
  getTimeUntilReset,
} from '../rate-limiter'
import { IPC_CHANNELS, RATE_LIMITS } from '../types'
import type { RateLimitConfig, IpcChannel } from '../types'

// ─── RateLimiter class tests (injected time, no fake timers needed) ───

describe('RateLimiter (class)', () => {
  let time: number
  let limiter: RateLimiter

  const config: Partial<Record<IpcChannel, RateLimitConfig>> = {
    [IPC_CHANNELS.SYSTEM_SHUTDOWN]: { maxCalls: 1, windowMs: 60000 },
    [IPC_CHANNELS.OPEN_DEV_TOOLS]: { maxCalls: 3, windowMs: 60000 },
  }

  beforeEach(() => {
    time = 1000000
    limiter = new RateLimiter(config, () => time)
  })

  describe('check', () => {
    it('should allow requests within limit', () => {
      const result = limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0) // 1 maxCalls - 1 used = 0
      expect(result.retryAfterMs).toBe(0)
    })

    it('should block requests exceeding limit', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN) // use the 1 allowed call
      const result = limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterMs).toBe(60000)
    })

    it('should allow after window expires', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(false)

      // Advance past window
      time += 60001

      const result = limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(result.allowed).toBe(true)
    })

    it('should return allowed=true with remaining=-1 for unconfigured channels', () => {
      const result = limiter.check(IPC_CHANNELS.GET_DEVICE_INFO)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(-1)
      expect(result.retryAfterMs).toBe(0)
    })

    it('should track multiple channels independently', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(false)

      // Different channel still works
      expect(limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS).allowed).toBe(true)
    })

    it('should return correct remaining count', () => {
      const r1 = limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      expect(r1.remaining).toBe(2) // 3 - 1

      const r2 = limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      expect(r2.remaining).toBe(1) // 3 - 2

      const r3 = limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      expect(r3.remaining).toBe(0) // 3 - 3

      const r4 = limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      expect(r4.allowed).toBe(false)
      expect(r4.remaining).toBe(0)
    })

    it('should calculate retryAfterMs correctly', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN) // at time=1000000

      time += 20000 // 20s later

      const result = limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBe(40000) // 60000 - 20000
    })
  })

  describe('getRemaining', () => {
    it('should return maxCalls for fresh channel', () => {
      expect(limiter.getRemaining(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(1)
    })

    it('should return -1 for unconfigured channel', () => {
      expect(limiter.getRemaining(IPC_CHANNELS.GET_DEVICE_INFO)).toBe(-1)
    })

    it('should decrease after usage', () => {
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      expect(limiter.getRemaining(IPC_CHANNELS.OPEN_DEV_TOOLS)).toBe(1)
    })

    it('should restore after window expires', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(limiter.getRemaining(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(0)

      time += 60001
      expect(limiter.getRemaining(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(1)
    })
  })

  describe('getTimeUntilReset', () => {
    it('should return 0 for fresh channel', () => {
      expect(limiter.getTimeUntilReset(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(0)
    })

    it('should return 0 for unconfigured channel', () => {
      expect(limiter.getTimeUntilReset(IPC_CHANNELS.GET_DEVICE_INFO)).toBe(0)
    })

    it('should return correct time after a call', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN) // at time=1000000
      time += 10000

      expect(limiter.getTimeUntilReset(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(50000)
    })

    it('should return 0 after all entries expire', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      time += 60001

      expect(limiter.getTimeUntilReset(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset specific channel', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(false)

      limiter.reset(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(true)
    })

    it('should not affect other channels', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)

      limiter.reset(IPC_CHANNELS.SYSTEM_SHUTDOWN)

      expect(limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(true)
      expect(limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS).allowed).toBe(false)
    })
  })

  describe('resetAll', () => {
    it('should reset all channels', () => {
      limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)
      limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS)

      limiter.resetAll()

      expect(limiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(true)
      expect(limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS).allowed).toBe(true)
    })
  })

  describe('boundary cases', () => {
    it('should handle windowMs=0 (every call starts a new window)', () => {
      const zeroWindowLimiter = new RateLimiter(
        { [IPC_CHANNELS.SYSTEM_SHUTDOWN]: { maxCalls: 1, windowMs: 0 } },
        () => time,
      )

      // First call allowed
      expect(zeroWindowLimiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(true)
      // windowMs=0 means all previous calls are expired instantly
      expect(zeroWindowLimiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN).allowed).toBe(true)
    })

    it('should handle maxCalls=0 (always rate limited)', () => {
      const zeroCapsLimiter = new RateLimiter(
        { [IPC_CHANNELS.SYSTEM_SHUTDOWN]: { maxCalls: 0, windowMs: 60000 } },
        () => time,
      )

      const result = zeroCapsLimiter.check(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should handle rapid successive calls at the same timestamp', () => {
      // 3 calls allowed, all at exact same time
      expect(limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS).allowed).toBe(true)
      expect(limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS).allowed).toBe(true)
      expect(limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS).allowed).toBe(true)
      expect(limiter.check(IPC_CHANNELS.OPEN_DEV_TOOLS).allowed).toBe(false)
    })
  })
})

// ─── Backward-compatible module-level function tests ───

describe('Rate Limiter (module functions)', () => {
  beforeEach(() => {
    resetAllRateLimits()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', () => {
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
    })

    it('should block requests exceeding rate limit', () => {
      const config = RATE_LIMITS[IPC_CHANNELS.SYSTEM_SHUTDOWN]

      for (let i = 0; i < config!.maxCalls; i++) {
        expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      }

      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(false)
    })

    it('should allow requests after window expires', () => {
      const config = RATE_LIMITS[IPC_CHANNELS.SYSTEM_SHUTDOWN]

      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(false)

      vi.advanceTimersByTime(config!.windowMs + 1)

      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
    })

    it('should return true for channels without rate limit', () => {
      for (let i = 0; i < 100; i++) {
        expect(checkRateLimit(IPC_CHANNELS.GET_DEVICE_INFO)).toBe(true)
      }
    })

    it('should handle multiple channels independently', () => {
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(false)

      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_RESTART)).toBe(true)
    })
  })

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific channel', () => {
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(false)

      resetRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)

      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
    })

    it('should not affect other channels', () => {
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_RESTART)).toBe(true)

      resetRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)

      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_RESTART)).toBe(false)
    })
  })

  describe('resetAllRateLimits', () => {
    it('should reset all rate limits', () => {
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_RESTART)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(false)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_RESTART)).toBe(false)

      resetAllRateLimits()

      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(true)
      expect(checkRateLimit(IPC_CHANNELS.SYSTEM_RESTART)).toBe(true)
    })
  })

  describe('getRemainingCalls', () => {
    it('should return max calls for fresh channel', () => {
      const config = RATE_LIMITS[IPC_CHANNELS.SYSTEM_SHUTDOWN]
      expect(getRemainingCalls(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(config!.maxCalls)
    })

    it('should return remaining calls after some usage', () => {
      const config = RATE_LIMITS[IPC_CHANNELS.OPEN_DEV_TOOLS]

      checkRateLimit(IPC_CHANNELS.OPEN_DEV_TOOLS)
      checkRateLimit(IPC_CHANNELS.OPEN_DEV_TOOLS)

      expect(getRemainingCalls(IPC_CHANNELS.OPEN_DEV_TOOLS)).toBe(config!.maxCalls - 2)
    })

    it('should return 0 when exhausted', () => {
      checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(getRemainingCalls(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(0)
    })

    it('should return -1 for channels without rate limit', () => {
      expect(getRemainingCalls(IPC_CHANNELS.GET_DEVICE_INFO)).toBe(-1)
    })
  })

  describe('getTimeUntilReset', () => {
    it('should return 0 for fresh channel', () => {
      expect(getTimeUntilReset(IPC_CHANNELS.SYSTEM_SHUTDOWN)).toBe(0)
    })

    it('should return time until reset after rate limit hit', () => {
      const config = RATE_LIMITS[IPC_CHANNELS.SYSTEM_SHUTDOWN]

      checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)

      const timeUntilReset = getTimeUntilReset(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(timeUntilReset).toBeGreaterThan(0)
      expect(timeUntilReset).toBeLessThanOrEqual(config!.windowMs)
    })

    it('should decrease over time', () => {
      checkRateLimit(IPC_CHANNELS.SYSTEM_SHUTDOWN)

      const initialTime = getTimeUntilReset(IPC_CHANNELS.SYSTEM_SHUTDOWN)

      vi.advanceTimersByTime(10000)

      const laterTime = getTimeUntilReset(IPC_CHANNELS.SYSTEM_SHUTDOWN)
      expect(laterTime).toBeLessThan(initialTime)
    })

    it('should return 0 for channels without rate limit', () => {
      checkRateLimit(IPC_CHANNELS.GET_DEVICE_INFO)
      expect(getTimeUntilReset(IPC_CHANNELS.GET_DEVICE_INFO)).toBe(0)
    })
  })
})
