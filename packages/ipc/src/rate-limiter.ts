/**
 * Rate limiter for IPC channels
 */

import { RATE_LIMITS, type IpcChannel, type RateLimiterState } from './types';

/**
 * Store for rate limiter state per channel
 */
const rateLimiterStore = new Map<IpcChannel, RateLimiterState>();

/**
 * Check if a request is allowed under rate limits
 * @param channel - IPC channel to check
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(channel: IpcChannel): boolean {
  const config = RATE_LIMITS[channel];

  // No rate limit configured for this channel
  if (!config) {
    return true;
  }

  const now = Date.now();
  let state = rateLimiterStore.get(channel);

  // Initialize state if not exists
  if (!state) {
    state = {
      calls: [],
      channel,
    };
    rateLimiterStore.set(channel, state);
  }

  // Remove expired calls outside the window
  state.calls = state.calls.filter((timestamp) => now - timestamp < config.windowMs);

  // Check if under limit
  if (state.calls.length < config.maxCalls) {
    state.calls.push(now);
    return true;
  }

  return false;
}

/**
 * Reset rate limiter for a specific channel
 * @param channel - IPC channel to reset
 */
export function resetRateLimit(channel: IpcChannel): void {
  rateLimiterStore.delete(channel);
}

/**
 * Reset all rate limiters
 */
export function resetAllRateLimits(): void {
  rateLimiterStore.clear();
}

/**
 * Get remaining calls for a channel
 * @param channel - IPC channel to check
 * @returns number of remaining calls, or -1 if no limit
 */
export function getRemainingCalls(channel: IpcChannel): number {
  const config = RATE_LIMITS[channel];

  if (!config) {
    return -1;
  }

  const now = Date.now();
  const state = rateLimiterStore.get(channel);

  if (!state) {
    return config.maxCalls;
  }

  // Count valid calls within the window
  const validCalls = state.calls.filter((timestamp) => now - timestamp < config.windowMs);

  return Math.max(0, config.maxCalls - validCalls.length);
}

/**
 * Get time until rate limit resets for a channel
 * @param channel - IPC channel to check
 * @returns milliseconds until reset, or 0 if not rate limited
 */
export function getTimeUntilReset(channel: IpcChannel): number {
  const config = RATE_LIMITS[channel];

  if (!config) {
    return 0;
  }

  const state = rateLimiterStore.get(channel);

  if (!state || state.calls.length === 0) {
    return 0;
  }

  const now = Date.now();
  const oldestCall = Math.min(...state.calls);
  const resetTime = oldestCall + config.windowMs;

  return Math.max(0, resetTime - now);
}
