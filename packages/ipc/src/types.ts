/**
 * @kiosk/ipc type definitions
 */

import type { DeviceInfo, UpdateInfo } from '@kiosk/shared'

export interface ShellAPI {
  /** Get device information */
  getDeviceInfo(): Promise<DeviceInfo>

  /** Request update check */
  requestUpdate(): Promise<UpdateInfo>

  /** System shutdown (requires admin session token) */
  systemShutdown(token: string): Promise<void>

  /** System restart (requires admin session token) */
  systemRestart(token: string): Promise<void>

  /** Open DevTools (requires password) */
  openDevTools(password: string): Promise<boolean>

  /** Trigger admin panel (fires IPC event to main process) */
  triggerAdmin(): void

  checkBusinessStatus(token: string, url: string): Promise<AdminBusinessNetworkStatus>
}

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

  // Admin panel (requires session token)
  ADMIN_WINDOW_CLOSE: 'shell:adminWindowClose',
  ADMIN_LOGIN: 'shell:adminLogin',
  ADMIN_EXIT_APP: 'shell:adminExitApp',
  ADMIN_RESTART_APP: 'shell:adminRestartApp',
  ADMIN_SYSTEM_RESTART: 'shell:adminSystemRestart',
  ADMIN_SYSTEM_SHUTDOWN: 'shell:adminSystemShutdown',
  ADMIN_GET_CONFIG: 'shell:adminGetConfig',
  ADMIN_GET_SYSTEM_INFO: 'shell:adminGetSystemInfo',
  ADMIN_RELOAD_BUSINESS: 'shell:adminReloadBusiness',

  // Admin trigger (from renderer click zone)
  ADMIN_TRIGGER: 'shell:adminTrigger',

  // Business status
  ADMIN_BUSINESS_STATUS: 'admin:getBusinessStatus',

  // Network test
  ADMIN_NETWORK_TEST: 'admin:networkTest',

  // Hardware info
  ADMIN_COLLECT_HARDWARE_INFO: 'admin:collectHardwareInfo',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of calls allowed in the window */
  maxCalls: number
  /** Time window in milliseconds */
  windowMs: number
}

/**
 * Rate limits for IPC channels
 */
export const RATE_LIMITS: Partial<Record<IpcChannel, RateLimitConfig>> = {
  [IPC_CHANNELS.SYSTEM_SHUTDOWN]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.SYSTEM_RESTART]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.OPEN_DEV_TOOLS]: { maxCalls: 3, windowMs: 60000 },
  [IPC_CHANNELS.ADMIN_LOGIN]: { maxCalls: 5, windowMs: 60000 },
  [IPC_CHANNELS.ADMIN_EXIT_APP]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.ADMIN_RESTART_APP]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.ADMIN_SYSTEM_RESTART]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN]: { maxCalls: 1, windowMs: 60000 },
  [IPC_CHANNELS.ADMIN_RELOAD_BUSINESS]: { maxCalls: 3, windowMs: 10000 },
}

/**
 * Structured result from RateLimiter.check()
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Remaining calls in the current window, or -1 if no limit */
  remaining: number
  /** Milliseconds until the caller can retry (0 if allowed) */
  retryAfterMs: number
}

/**
 * IPC handler function type
 */
export type IpcHandler<TArgs = unknown, TResult = unknown> = (
  event: Electron.IpcMainInvokeEvent,
  ...args: TArgs[]
) => Promise<TResult> | TResult

/**
 * IPC handler registration options
 */
export interface HandlerOptions {
  /** Enable rate limiting for this handler */
  rateLimit?: RateLimitConfig
  /** Require password verification */
  requirePassword?: boolean
}

/**
 * Handler result types
 */
export interface SystemShutdownResult {
  success: boolean
  message?: string
}

export interface SystemRestartResult {
  success: boolean
  message?: string
}

export interface DeviceInfoResult extends DeviceInfo {}

export interface UpdateResult extends UpdateInfo {}

export interface DebugResult {
  success: boolean
  message?: string
}

/**
 * Admin window result
 */
export interface AdminWindowCloseResult {
  success: boolean
  message?: string
}

/**
 * Admin login result
 */
export interface AdminLoginResult {
  success: boolean
  token?: string
  message?: string
}

/**
 * Admin operation result
 */
export interface AdminOperationResult {
  success: boolean
  message?: string
  data?: Record<string, unknown>
}

/**
 * 网络连通性测试
 */
export interface AdminNetworkTestResult {
  success: boolean
  message?: string
  host?: string
  sent?: number
  received?: number
  packetLoss?: number
  minTime?: number
  maxTime?: number
  avgTime?: number
  timestamp?: number
}

/**
 * 业务网络状态
 */
export interface AdminBusinessNetworkStatus {
  success: boolean
  message?: string
  latency?: number
  isOnline?: boolean
  statusCode?: number
}

/**
 * Password verification result
 */
export interface PasswordVerifyResult {
  valid: boolean
  message?: string
}

/**
 * Re-export shared types
 */
export type { DeviceInfo, UpdateInfo }
