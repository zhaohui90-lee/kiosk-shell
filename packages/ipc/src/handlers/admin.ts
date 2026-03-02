/**
 * Admin panel IPC handlers
 * Handles admin authentication and privileged operations
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'
import { getLogger } from '@kiosk/logger'
import { getPlatformAdapter } from '@kiosk/platform'
import { getSystemMerics, checkBusinessStatus, loadConfig } from '@kiosk/device'
import { IPC_CHANNELS, AdminNetworkTestResult, type AdminLoginResult, type AdminOperationResult } from '../types'
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
 * Set custom admin password
 */
export function setAdminPassword(password: string): void {
  if (password && password.length >= 8) {
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
 * Invalidate current session
 */
export function invalidateSession(): void {
  activeSessionToken = null
  logger.debug('[IPC:Admin] Session invalidated')
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

  if (password !== adminPassword) {
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
async function handleAdminExitApp(_event: Electron.IpcMainInvokeEvent, token: string): Promise<AdminOperationResult> {
  const channel = IPC_CHANNELS.ADMIN_EXIT_APP

  if (!checkRateLimit(channel)) {
    return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
  }

  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] Exit app rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

  logger.info('[IPC:Admin] Exit app requested')

  try {
    app.quit()
    return { success: true, message: 'Application exiting' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Exit app failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
}

/**
 * Handle restart app request
 */
async function handleAdminRestartApp(
  _event: Electron.IpcMainInvokeEvent,
  token: string,
): Promise<AdminOperationResult> {
  const channel = IPC_CHANNELS.ADMIN_RESTART_APP

  if (!checkRateLimit(channel)) {
    return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
  }

  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] Restart app rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

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
}

/**
 * Handle system restart request
 */
async function handleAdminSystemRestart(
  _event: Electron.IpcMainInvokeEvent,
  token: string,
): Promise<AdminOperationResult> {
  const channel = IPC_CHANNELS.ADMIN_SYSTEM_RESTART

  if (!checkRateLimit(channel)) {
    return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
  }

  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] System restart rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

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
}

/**
 * Handle system shutdown request
 */
async function handleAdminSystemShutdown(
  _event: Electron.IpcMainInvokeEvent,
  token: string,
): Promise<AdminOperationResult> {
  const channel = IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN

  if (!checkRateLimit(channel)) {
    return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
  }

  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] System shutdown rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

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
}

/**
 * Handle get config request (read-only)
 */
async function handleAdminGetConfig(_event: Electron.IpcMainInvokeEvent, token: string): Promise<AdminOperationResult> {
  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] Get config rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

  logger.debug('[IPC:Admin] Get config requested')

  try {
    const appConfig = loadConfig()
    // Return basic app info (not the actual config object to avoid exposing passwords)
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
}

/**
 * Handle get system info request
 */
async function handleAdminGetSystemInfo(
  _event: Electron.IpcMainInvokeEvent,
  token: string,
): Promise<AdminOperationResult> {
  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] Get system info rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

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
}

/**
 * Handle reload business page request
 */
async function handleAdminReloadBusiness(
  _event: Electron.IpcMainInvokeEvent,
  token: string,
): Promise<AdminOperationResult> {
  const channel = IPC_CHANNELS.ADMIN_RELOAD_BUSINESS

  if (!checkRateLimit(channel)) {
    return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
  }

  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] Reload business rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

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
}

const execAsync = promisify(exec)

async function handleAdminTestNetwork(
  _event: Electron.IpcMainInvokeEvent,
  token: string,
  host: string,
  count = 4,
): Promise<AdminNetworkTestResult> {
  if (!verifyToken(token)) {
    logger.warn('[IPC:Admin] Test network rejected: invalid token')
    return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
  }

  logger.info('[IPC:Admin] Test network requested')

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
}

function parsePingResult(output: string, host: string, platform: string): AdminNetworkTestResult {
  let sent = 0, received = 0, packetLoss = 0
  let minTime = 0, maxTime = 0, avgTime = 0

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
    const statsMatch = output.match(/(\d+) packets transmitted, (\d+) received, ([\d.]+)% packet loss/)
    if (statsMatch) {
      sent = parseInt(statsMatch[1]!)
      received = parseInt(statsMatch[2]!)
      packetLoss = parseFloat(statsMatch[3]!)
    }

    const timeMatch = output.match(/min\/avg\/max\/stddev = ([\d.]+)\/([\d.]+)\/([\d.]+)/)
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

/**
 * Register admin IPC handlers
 */
export function registerAdminHandlers(): void {
  logger.debug('[IPC:Admin] Registering admin handlers')

  ipcMain.handle(IPC_CHANNELS.ADMIN_LOGIN, handleAdminLogin)
  ipcMain.handle(IPC_CHANNELS.ADMIN_EXIT_APP, handleAdminExitApp)
  ipcMain.handle(IPC_CHANNELS.ADMIN_RESTART_APP, handleAdminRestartApp)
  ipcMain.handle(IPC_CHANNELS.ADMIN_SYSTEM_RESTART, handleAdminSystemRestart)
  ipcMain.handle(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN, handleAdminSystemShutdown)
  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_CONFIG, handleAdminGetConfig)
  ipcMain.handle(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO, handleAdminGetSystemInfo)
  ipcMain.handle(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS, handleAdminReloadBusiness)
  ipcMain.handle(IPC_CHANNELS.ADMIN_NETWORK_TEST, handleAdminTestNetwork)
  ipcMain.handle(IPC_CHANNELS.ADMIN_SYSTEM_METRICS, async () => {
    return await getSystemMerics()
  })
  ipcMain.handle(IPC_CHANNELS.ADMIN_BUSINESS_STATUS, async (_, targetUrl: string) => {
    if (!targetUrl) {
      throw new Error('未提供交易地址')
    }
    return await checkBusinessStatus(targetUrl)
  })

  logger.debug('[IPC:Admin] Admin handlers registered')
}

/**
 * Unregister admin IPC handlers
 */
export function unregisterAdminHandlers(): void {
  logger.debug('[IPC:Admin] Unregistering admin handlers')

  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_LOGIN)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_EXIT_APP)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_RESTART_APP)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_SYSTEM_RESTART)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_GET_CONFIG)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_NETWORK_TEST)
  ipcMain.removeHandler(IPC_CHANNELS.ADMIN_SYSTEM_METRICS)
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
}
