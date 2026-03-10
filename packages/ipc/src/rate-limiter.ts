/**
 * Rate limiter for IPC channels
 *
 * Uses a sliding window algorithm to enforce per-channel call limits.
 * Supports dependency injection for time source (testability) and config.
 */

import { RATE_LIMITS, type IpcChannel, type RateLimitConfig, type RateLimitResult } from './types'

/**
 * RateLimiter — class-based rate limiter with dependency injection.
 *
 * - Injected time source → tests don't need vi.useFakeTimers
 * - check() returns structured RateLimitResult → callers know retryAfterMs
 * - All read operations clean expired entries → no stale data in memory
 */
export class RateLimiter {
  private store = new Map<IpcChannel, number[]>()

  constructor(
    private config: Partial<Record<IpcChannel, RateLimitConfig>> = RATE_LIMITS,
    private now: () => number = () => Date.now(),
  ) {}

  /**
   * Check if a request is allowed, record the call if so.
   */
  check(channel: IpcChannel): RateLimitResult {
    const limit = this.config[channel]

    // No rate limit configured — always allow
    if (!limit) {
      return { allowed: true, remaining: -1, retryAfterMs: 0 }
    }

    const now = this.now()
    const calls = this.cleanExpired(channel, limit.windowMs, now)

    if (calls.length < limit.maxCalls) {
      calls.push(now)
      this.store.set(channel, calls)
      return {
        allowed: true,
        remaining: limit.maxCalls - calls.length,
        retryAfterMs: 0,
      }
    }

    // Rate limited — calculate retry time from oldest call
    const retryAfterMs = calls.length > 0
      ? Math.max(0, calls[0]! + limit.windowMs - now)
      : 0

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    }
  }

  /**
   * Get remaining calls for a channel.
   */
  getRemaining(channel: IpcChannel): number {
    const limit = this.config[channel]
    if (!limit) return -1

    const calls = this.cleanExpired(channel, limit.windowMs, this.now())
    return Math.max(0, limit.maxCalls - calls.length)
  }

  /**
   * Get milliseconds until the rate limit window resets.
   */
  getTimeUntilReset(channel: IpcChannel): number {
    const limit = this.config[channel]
    if (!limit) return 0

    const calls = this.cleanExpired(channel, limit.windowMs, this.now())
    if (calls.length === 0) return 0

    // calls are in chronological order, oldest is [0]
    return Math.max(0, calls[0]! + limit.windowMs - this.now())
  }

  /**
   * Reset rate limiter for a specific channel.
   */
  reset(channel: IpcChannel): void {
    this.store.delete(channel)
  }

  /**
   * Reset all rate limiters.
   */
  resetAll(): void {
    this.store.clear()
  }

  /**
   * Remove expired calls and update the store. Returns the cleaned array.
   */
  private cleanExpired(channel: IpcChannel, windowMs: number, now: number): number[] {
    const raw = this.store.get(channel) ?? []
    const valid = raw.filter((t) => now - t < windowMs)
    this.store.set(channel, valid)
    return valid
  }
}

// ─── Singleton + backward-compatible module-level functions ───

const defaultLimiter = new RateLimiter()

/**
 * Check if a request is allowed under rate limits.
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(channel: IpcChannel): boolean {
  return defaultLimiter.check(channel).allowed
}

/**
 * Reset rate limiter for a specific channel.
 */
export function resetRateLimit(channel: IpcChannel): void {
  defaultLimiter.reset(channel)
}

/**
 * Reset all rate limiters.
 */
export function resetAllRateLimits(): void {
  defaultLimiter.resetAll()
}

/**
 * Get remaining calls for a channel.
 * @returns remaining calls, or -1 if no limit configured
 */
export function getRemainingCalls(channel: IpcChannel): number {
  return defaultLimiter.getRemaining(channel)
}

/**
 * Get time until rate limit resets for a channel.
 * @returns milliseconds until reset, or 0 if not rate limited
 */
export function getTimeUntilReset(channel: IpcChannel): number {
  return defaultLimiter.getTimeUntilReset(channel)
}
