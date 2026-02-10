/**
 * @kiosk/ipc
 * IPC handlers and preload scripts
 */

// Export types
export type {
  IpcChannel,
  RateLimitConfig,
  IpcHandler,
  HandlerOptions,
  SystemShutdownResult,
  SystemRestartResult,
  DeviceInfoResult,
  UpdateResult,
  DebugResult,
  AdminLoginResult,
  AdminOperationResult,
  RateLimiterState,
  PasswordVerifyResult,
  DeviceInfo,
  UpdateInfo,
} from './types';

// Export constants
export { IPC_CHANNELS, RATE_LIMITS } from './types';
export {
  DEFAULT_DEBUG_PASSWORD,
  DEFAULT_ADMIN_PASSWORD,
  SHELL_API_NAMESPACE,
  ADMIN_API_NAMESPACE,
  PRELOAD_CONFIG,
  ERROR_MESSAGES,
} from './constants';

// Export rate limiter
export {
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRemainingCalls,
  getTimeUntilReset,
} from './rate-limiter';

// Export handlers
export {
  registerSystemHandlers,
  unregisterSystemHandlers,
  registerDeviceHandlers,
  unregisterDeviceHandlers,
  registerDebugHandlers,
  unregisterDebugHandlers,
  setDebugPassword,
  registerAdminHandlers,
  unregisterAdminHandlers,
  setAdminPassword,
  setMainWindowRef,
  invalidateSession,
} from './handlers';

// Export preload (for use in preload script)
export { shellAPI, exposeShellAPI } from './preload';

/**
 * Register all IPC handlers
 * Call this in the main process during app initialization
 */
export function registerAllHandlers(): void {
  const { registerSystemHandlers } = require('./handlers/system');
  const { registerDeviceHandlers } = require('./handlers/device');
  const { registerDebugHandlers } = require('./handlers/debug');
  const { registerAdminHandlers } = require('./handlers/admin');

  registerSystemHandlers();
  registerDeviceHandlers();
  registerDebugHandlers();
  registerAdminHandlers();
}

/**
 * Unregister all IPC handlers
 * Call this during app shutdown
 */
export function unregisterAllHandlers(): void {
  const { unregisterSystemHandlers } = require('./handlers/system');
  const { unregisterDeviceHandlers } = require('./handlers/device');
  const { unregisterDebugHandlers } = require('./handlers/debug');
  const { unregisterAdminHandlers } = require('./handlers/admin');

  unregisterSystemHandlers();
  unregisterDeviceHandlers();
  unregisterDebugHandlers();
  unregisterAdminHandlers();
}
