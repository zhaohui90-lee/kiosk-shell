/**
 * @kiosk/ipc constants
 */

/**
 * Default debug password (should be overridden in production)
 * In production, this should be loaded from secure configuration
 */
export const DEFAULT_DEBUG_PASSWORD = 'kiosk-debug-2024';

/**
 * Default admin password (should be overridden in production)
 */
export const DEFAULT_ADMIN_PASSWORD = 'kiosk-admin-2024';

/**
 * API namespace for contextBridge
 */
export const SHELL_API_NAMESPACE = 'shellAPI';

/**
 * Admin API namespace for contextBridge (admin window only)
 */
export const ADMIN_API_NAMESPACE = 'adminAPI';

/**
 * Preload script context isolation settings
 */
export const PRELOAD_CONFIG = {
  /** Context isolation must be enabled */
  contextIsolation: true,
  /** Node integration must be disabled */
  nodeIntegration: false,
  /** Sandbox mode recommended */
  sandbox: true,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  RATE_LIMITED: 'Request rate limited. Please try again later.',
  INVALID_CHANNEL: 'Invalid IPC channel.',
  INVALID_PASSWORD: 'Invalid password.',
  OPERATION_FAILED: 'Operation failed.',
  NOT_INITIALIZED: 'IPC handlers not initialized.',
  INVALID_TOKEN: 'Invalid or expired session token.',
  ADMIN_NOT_AUTHENTICATED: 'Admin authentication required.',
} as const;
