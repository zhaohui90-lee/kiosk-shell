/**
 * @kiosk/ipc
 * IPC handlers and preload scripts
 */

// Export types
export type {
  IpcChannel,
  RateLimitConfig,
  RateLimitResult,
  IpcHandler,
  HandlerOptions,
  SystemShutdownResult,
  SystemRestartResult,
  DeviceInfoResult,
  UpdateResult,
  DebugResult,
  AdminLoginResult,
  AdminOperationResult,
  ImeOperationResult,
  ImeConfig,
  PasswordVerifyResult,
  DeviceInfo,
  UpdateInfo,
} from './types'

// Export constants
export { IPC_CHANNELS, RATE_LIMITS } from './types'
export {
  DEFAULT_DEBUG_PASSWORD,
  DEFAULT_ADMIN_PASSWORD,
  SHELL_API_NAMESPACE,
  ADMIN_API_NAMESPACE,
  PRELOAD_CONFIG,
  ERROR_MESSAGES,
} from './constants'

// Export rate limiter
export {
  RateLimiter,
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRemainingCalls,
  getTimeUntilReset,
} from './rate-limiter'

// Import handlers (also re-exported below for public API)
import {
  registerSystemHandlers,
  unregisterSystemHandlers,
  registerDebugHandlers,
  unregisterDebugHandlers,
  setDebugPassword,
  registerAdminHandlers,
  unregisterAdminHandlers,
  setAdminPassword,
  setMainWindowRef,
  invalidateSession,
  verifyAdminSessionToken,
  registerImeHandlers,
  unregisterImeHandlers,
  setImeConfig,
} from './handlers'

// Re-export handlers for consumers
export {
  registerSystemHandlers,
  unregisterSystemHandlers,
  registerDebugHandlers,
  unregisterDebugHandlers,
  setDebugPassword,
  registerAdminHandlers,
  unregisterAdminHandlers,
  setAdminPassword,
  setMainWindowRef,
  invalidateSession,
  verifyAdminSessionToken,
  registerImeHandlers,
  unregisterImeHandlers,
  setImeConfig,
}

// Export preload (for use in preload script)
export { shellAPI, exposeShellAPI } from './preload'

/**
 * Register all IPC handlers
 * Call this in the main process during app initialization
 */
export function registerAllHandlers(): void {
  registerSystemHandlers()
  registerDebugHandlers()
  registerAdminHandlers()
  registerImeHandlers()
}

/**
 * Unregister all IPC handlers
 * Call this during app shutdown
 */
export function unregisterAllHandlers(): void {
  unregisterSystemHandlers()
  unregisterDebugHandlers()
  unregisterAdminHandlers()
  unregisterImeHandlers()
}
