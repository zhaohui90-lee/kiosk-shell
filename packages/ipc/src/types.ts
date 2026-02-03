/**
 * @kiosk/ipc type definitions
 */

import type { DeviceInfo, UpdateInfo } from '@kiosk/shared';

/**
 * IPC Channel names (whitelist)
 */
export const IPC_CHANNELS = {
  // System control
  SYSTEM_SHUTDOWN: 'shell:systemShutdown',
  SYSTEM_RESTART: 'shell:systemRestart',

  // Device information
  GET_DEVICE_INFO: 'shell:getDeviceInfo',

  // Update control
  REQUEST_UPDATE: 'shell:requestUpdate',

  // Debug (requires password)
  OPEN_DEV_TOOLS: 'shell:openDevTools',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of calls allowed in the window */
  maxCalls: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Rate limits for IPC channels
 */
export const RATE_LIMITS: Partial<Record<IpcChannel, RateLimitConfig>> = {
  [IPC_CHANNELS.SYSTEM_SHUTDOWN]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.SYSTEM_RESTART]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.OPEN_DEV_TOOLS]: { maxCalls: 3, windowMs: 60000 },
};

/**
 * IPC handler function type
 */
export type IpcHandler<TArgs = unknown, TResult = unknown> = (
  event: Electron.IpcMainInvokeEvent,
  ...args: TArgs[]
) => Promise<TResult> | TResult;

/**
 * IPC handler registration options
 */
export interface HandlerOptions {
  /** Enable rate limiting for this handler */
  rateLimit?: RateLimitConfig;
  /** Require password verification */
  requirePassword?: boolean;
}

/**
 * Handler result types
 */
export interface SystemShutdownResult {
  success: boolean;
  message?: string;
}

export interface SystemRestartResult {
  success: boolean;
  message?: string;
}

export interface DeviceInfoResult extends DeviceInfo {}

export interface UpdateResult extends UpdateInfo {}

export interface DebugResult {
  success: boolean;
  message?: string;
}

/**
 * Rate limiter state
 */
export interface RateLimiterState {
  calls: number[];
  channel: IpcChannel;
}

/**
 * Password verification result
 */
export interface PasswordVerifyResult {
  valid: boolean;
  message?: string;
}

/**
 * Re-export shared types
 */
export type { DeviceInfo, UpdateInfo };
