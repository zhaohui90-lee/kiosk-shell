/**
 * Admin panel IPC handlers
 * Handles admin authentication and privileged operations
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'
import { performance } from 'perf_hooks'
import { getLogger } from '@kiosk/logger'
import { getPlatformAdapter } from '@kiosk/platform'
import { isSecurePasswordOverride, verifyPassword } from '@kiosk/shared'
import { loadConfig, collectHardwareInfo as handleCollectHardwareInfo, type HardwareInfoConfig } from '@kiosk/device'
import { getWindowManager } from '@kiosk/core'
import {
  IPC_CHANNELS,
  AdminNetworkTestResult,
  type AdminLoginResult,
  type AdminOperationResult,
  AdminWindowCloseResult,
  IpcChannel,
} from '../types'
import { DEFAULT_ADMIN_PASSWORD, ERROR_MESSAGES } from '../constants'
import { checkRateLimit } from '../rate-limiter'

const logger = getLogger()

/**
 * Admin password (can be overridden via configuration)
 */
let adminPassword = DEFAULT_ADMIN_PASSWORD

/**
 * Active session token (in-memory, single session)
 */
let activeSessionToken: string | null = null

/**
 * Reference to main business window (set externally)
 */
let mainWindowRef: BrowserWindow | null = null

/**
 * Type definition for admin handler functions
 * T - tuple of argument types (excluding event)
 * R - return type
 */
type AdminHandlerFunction<T extends any[], R> = (event: Electron.IpcMainInvokeEvent, ...args: T) => Promise<R>

/**
 * Set custom admin password
 */
export function setAdminPassword(password: string): void {
  if (isSecurePasswordOverride(password)) {
    adminPassword = password
    logger.info('[IPC:Admin] Admin password updated')
  } else {
    logger.warn('[IPC:Admin] Invalid password provided, keeping existing')
  }
}

/**
 * Set reference to main business window
 */
export function setMainWindowRef(window: BrowserWindow | null): void {
  mainWindowRef = window
  logger.debug('[IPC:Admin] Main window reference updated')
}

/**
 * Generate a random session token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Verify session token
 */
function verifyToken(token: string): boolean {
  return !!activeSessionToken && token === activeSessionToken
}

/**
 * Verify admin session token for external handler reuse.
 */
export function verifyAdminSessionToken(token: string | undefined): boolean {
  return typeof token === 'string' && verifyToken(token)
}

/**
 * Invalidate current session
 */
export function invalidateSession(): void {
  activeSessionToken = null
  logger.debug('[IPC:Admin] Session invalidated')
}

/**
 * Handle admin window close
 */
async function handleAdminPanelClose(_event: Electron.IpcMainInvokeEvent): Promise<AdminWindowCloseResult> {
  logger.info('[IPC:Admin] Window close request')

  // Hide admin panel and invalidate session so user must re-login next time
  const windowManager = getWindowManager()
  windowManager.hideAdminWindow()
  invalidateSession()

  // Restore focus to main business window
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.focus()
  }

  logger.info('[IPC:Admin] Admin panel hidden, session invalidated')

  return { success: true }
}

/**
 * Handle admin login request
 */
async function handleAdminLogin(_event: Electron.IpcMainInvokeEvent, password: string): Promise<AdminLoginResult> {
  const channel = IPC_CHANNELS.ADMIN_LOGIN

  if (!checkRateLimit(channel)) {
    logger.warn('[IPC:Admin] Login request rate limited')
    return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
  }

  logger.info('[IPC:Admin] Processing login request')

  if (!verifyPassword(password, adminPassword)) {
    logger.warn('[IPC:Admin] Invalid password attempt')
    return { success: false, message: ERROR_MESSAGES.INVALID_PASSWORD }
  }

  // Generate new session token (replaces any existing session)
  activeSessionToken = generateToken()
  logger.info('[IPC:Admin] Login successful, session token generated')

  return { success: true, token: activeSessionToken }
}

/**
 * Handle exit app request
 */
const handleAdminExitApp = createAdminAction(IPC_CHANNELS.ADMIN_EXIT_APP, async () => {
  logger.info('[IPC:Admin] Exit app requested')

  try {
    app.quit()
    return { success: true, message: 'Application exiting' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Exit app failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

/**
 * Handle restart app request
 */
const handleAdminRestartApp = createAdminAction(IPC_CHANNELS.ADMIN_RESTART_APP, async () => {
  logger.info('[IPC:Admin] Restart app requested')

  try {
    app.relaunch()
    app.quit()
    return { success: true, message: 'Application restarting' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Restart app failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

/**
 * Handle system restart request
 */
const handleAdminSystemRestart = createAdminAction(IPC_CHANNELS.ADMIN_SYSTEM_RESTART, async () => {
  logger.info('[IPC:Admin] System restart requested')

  try {
    const platform = getPlatformAdapter()
    await platform.restart({ force: false, delay: 5 })
    return { success: true, message: 'System restart initiated' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] System restart failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

/**
 * Handle system shutdown request
 */
const handleAdminSystemShutdown = createAdminAction(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN, async () => {
  logger.info('[IPC:Admin] System shutdown requested')

  try {
    const platform = getPlatformAdapter()
    await platform.shutdown({ force: false, delay: 5 })
    return { success: true, message: 'System shutdown initiated' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] System shutdown failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

/**
 * Handle get config request (read-only)
 */
const handleAdminGetConfig = createAdminAction(IPC_CHANNELS.ADMIN_GET_CONFIG, async () => {
  logger.debug('[IPC:Admin] Get config requested')

  try {
    const appConfig = loadConfig()
    // Return basic app info (not the actual config object to avoid exposing sensitive data)
    const data: Record<string, unknown> = {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      locale: app.getLocale(),
      appPath: app.getAppPath(),
      deviceNo: appConfig.deviceNo,
    }

    return { success: true, data }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Get config failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

/**
 * Handle get system info request
 */
const handleAdminGetSystemInfo = createAdminAction(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO, async () => {
  logger.debug('[IPC:Admin] Get system info requested')

  try {
    const platform = getPlatformAdapter()
    const systemInfo = platform.getSystemInfo()

    const data: Record<string, unknown> = {
      platform: systemInfo.platform,
      arch: systemInfo.arch,
      hostname: systemInfo.hostname,
      release: systemInfo.release,
      totalMemory: systemInfo.totalMemory,
      freeMemory: systemInfo.freeMemory,
      cpuCount: systemInfo.cpuCount,
      ip: systemInfo.ip,
      electronVersion: process.versions['electron'],
      nodeVersion: process.versions['node'],
      chromeVersion: process.versions['chrome'],
      appVersion: app.getVersion(),
    }

    return { success: true, data }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Get system info failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

/**
 * Handle reload business page request
 */
const handleAdminReloadBusiness = createAdminAction(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS, async () => {
  logger.info('[IPC:Admin] Reload business page requested')

  try {
    if (!mainWindowRef || mainWindowRef.isDestroyed()) {
      return { success: false, message: 'Main window not available' }
    }

    mainWindowRef.webContents.reload()
    return { success: true, message: 'Business page reloaded' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Reload business failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

const execAsync = promisify(exec)

/**
 * Validate hostname to prevent command injection.
 * Only allows valid hostnames and IP addresses.
 */
function isValidHost(host: string): boolean {
  // Allow valid hostnames (RFC 1123) and IPv4/IPv6 addresses
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$/
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^[0-9a-fA-F:]+$/

  return hostnameRegex.test(host) || ipv4Regex.test(host) || ipv6Regex.test(host)
}

const handleAdminTestNetwork = createAdminAction(
  IPC_CHANNELS.ADMIN_NETWORK_TEST,
  async (_event, host: string, count = 4) => {
    logger.info('[IPC:Admin] Test network requested', { host })

    if (!isValidHost(host)) {
      logger.warn('[IPC:Admin] Test network rejected: invalid host', { host })
      return { success: false, message: 'Invalid host parameter' }
    }

    try {
      const platform = os.platform()
      let command: string

      if (platform === 'win32') {
        // windows
        command = `ping -n ${count} ${host}`
      } else {
        // linux/mac
        command = `ping -c ${count} ${host}`
      }

      const { stdout } = await execAsync(command)

      return parsePingResult(stdout, host, platform)
    } catch (error) {
      const err = error as Error
      logger.error('[IPC:Admin] Test network failed', { error: err.message })
      return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
    }
  },
)

function parsePingResult(output: string, host: string, platform: string): AdminNetworkTestResult {
  let sent = 0,
    received = 0,
    packetLoss = 0
  let minTime = 0,
    maxTime = 0,
    avgTime = 0

  if (platform === 'win32') {
    // Windows 解析
    const sentMatch = output.match(/已发送 = (\d+)/)
    const receivedMatch = output.match(/已接收 = (\d+)/)
    const lossMatch = output.match(/丢失 = (\d+)/)

    sent = sentMatch ? parseInt(sentMatch[1]!) : 0
    received = receivedMatch ? parseInt(receivedMatch[1]!) : 0
    const lost = lossMatch ? parseInt(lossMatch[1]!) : 0
    packetLoss = sent > 0 ? (lost / sent) * 100 : 0

    const timeMatch = output.match(/最短 = (\d+)ms，最长 = (\d+)ms，平均 = (\d+)ms/)
    if (timeMatch) {
      minTime = parseInt(timeMatch[1]!)
      maxTime = parseInt(timeMatch[2]!)
      avgTime = parseInt(timeMatch[3]!)
    }
  } else {
    // Linux/Mac 解析
    // Linux: "4 packets transmitted, 4 received, 0% packet loss"
    // macOS: "4 packets transmitted, 4 packets received, 0.0% packet loss"
    const statsMatch = output.match(/(\d+) packets transmitted, (\d+)(?: packets)? received, ([\d.]+)% packet loss/)
    if (statsMatch) {
      sent = parseInt(statsMatch[1]!)
      received = parseInt(statsMatch[2]!)
      packetLoss = parseFloat(statsMatch[3]!)
    }

    // Linux: "rtt min/avg/max/mdev = 0.380/0.405/0.431/0.026 ms"
    // macOS: "round-trip min/avg/max/stddev = 0.380/0.405/0.431/0.026 ms"
    const timeMatch = output.match(/min\/avg\/max\/(?:std|m)dev = ([\d.]+)\/([\d.]+)\/([\d.]+)/)
    if (timeMatch) {
      minTime = parseFloat(timeMatch[1]!)
      avgTime = parseFloat(timeMatch[2]!)
      maxTime = parseFloat(timeMatch[3]!)
    }
  }

  return {
    success: true,
    host,
    sent,
    received,
    packetLoss,
    minTime,
    maxTime,
    avgTime,
    timestamp: Date.now(),
  }
}

const checkBusinessStatus = createAdminAction(
  IPC_CHANNELS.ADMIN_BUSINESS_STATUS,
  async (_event, url: string) => {
    logger.info('[IPC:Admin] Check business network status requested', { url })

    if (!isValidHost(url)) {
      logger.warn('[IPC:Admin] Check business status rejected: invalid URL', { url })
      return { success: false, message: 'Invalid URL parameter' }
    }

    try {
      const start = performance.now()

      // 使用 fetch 发送一个轻量级的 HEAD 请求，避免拉取大量数据
      const response = await fetch(url, {
        method: 'HEAD',
        // 设置超时时间，例如 3 秒
        signal: AbortSignal.timeout(3000),
      })

      const end = performance.now()

      return {
        success: true,
        latency: Math.round(end - start),
        isOnline: response.ok,
        statusCode: response.status,
      }
    } catch (error) {
      // 捕获超时、DNS 错误、断网等异常
      return {
        success: false,
        message: 'Network error',
        latency: 9999, // 代表超时或不可达
        isOnline: false,
        statusCode: 0,
      }
    }
  },
)

function createAdminAction<T extends any[], R>(channel: IpcChannel, action: AdminHandlerFunction<T, R>) {
  return async (event: Electron.IpcMainInvokeEvent, token: string, ...args: T): Promise<AdminOperationResult | R> => {
    // 1. 速率限制
    if (!checkRateLimit(channel)) {
      return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
    }

    // 2. 验证令牌
    if (!verifyToken(token)) {
      return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
    }

    // 3. 执行操作
    try {
      return await action(event, ...args)
    } catch (error) {
      const err = error as Error
      logger.error(`[IPC:Admin] Operation failed on channel ${channel}`, { error: err.message })
      return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
    }
  }
}

/**
 * Register admin IPC handlers
 */
export function registerAdminHandlers(): void {
  logger.debug('[IPC:Admin] Registering admin handlers')

  ipcMain.handle(IPC_CHANNELS.ADMIN_WINDOW_CLOSE, handleAdminPanelClose)
  ipcMain.handle(IPC_CHANNELS.ADMIN_LOGIN, handleAdminLogin)
  ipcMain.handle(IPC_CHANNELS.ADMIN_EXIT_APP, handleAdminExitApp)
  ipcMain.handle(IPC_CHANNELS.ADMIN_RESTART_APP, handleAdminRestartApp)
  ipcMain.handle(IPC_CHANNELS.ADMIN_SYSTEM_RESTART, handleAdminSystemRestart)
  ipcMain.handle(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN, handleAdminSystemShutdown)
  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_CONFIG, handleAdminGetConfig)
  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO, handleAdminGetSystemInfo)
  ipcMain.handle(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS, handleAdminReloadBusiness)
  ipcMain.handle(IPC_CHANNELS.ADMIN_NETWORK_TEST, handleAdminTestNetwork)
  ipcMain.handle(IPC_CHANNELS.ADMIN_BUSINESS_STATUS, checkBusinessStatus)
  ipcMain.handle(IPC_CHANNELS.ADMIN_COLLECT_HARDWARE_INFO, async (_, config?: Partial<HardwareInfoConfig>) => {
    return handleCollectHardwareInfo(config)
  })

  logger.debug('[IPC:Admin] Admin handlers registered')
}

/**
 * Unregister admin IPC handlers
 */
export function unregisterAdminHandlers(): void {
  logger.debug('[IPC:Admin] Unregistering admin handlers')

  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_WINDOW_CLOSE)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_LOGIN)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_EXIT_APP)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_RESTART_APP)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_SYSTEM_RESTART)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_GET_CONFIG)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_NETWORK_TEST)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_BUSINESS_STATUS)

  // Invalidate any active session
  invalidateSession()

  logger.debug('[IPC:Admin] Admin handlers unregistered')
}

export {
  handleAdminLogin,
  handleAdminExitApp,
  handleAdminRestartApp,
  handleAdminSystemRestart,
  handleAdminSystemShutdown,
  handleAdminGetConfig,
  handleAdminGetSystemInfo,
  handleAdminReloadBusiness,
  handleAdminTestNetwork,
  parsePingResult,
  isValidHost,
}
