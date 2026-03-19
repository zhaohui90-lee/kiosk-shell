import { app } from 'electron'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { performance } from 'perf_hooks'
import { getLogger } from '@kiosk/logger'
import { getPlatformAdapter } from '@kiosk/platform'
import { loadConfig, collectHardwareInfo as handleCollectHardwareInfo, type HardwareInfoConfig } from '@kiosk/device'
import { getWindowManager } from '@kiosk/core'
import { IPC_CHANNELS, AdminNetworkTestResult } from '../../types'
import { ERROR_MESSAGES } from '../../constants'
import { createAdminAction } from './action-factory'
import { invalidateSession } from './auth'
import { getMainWindowRef } from './window-context'

const logger = getLogger()
const execAsync = promisify(exec)

export async function handleAdminPanelClose(_event: Electron.IpcMainInvokeEvent) {
  logger.info('[IPC:Admin] Window close request')

  const windowManager = getWindowManager()
  windowManager.hideAdminWindow()
  invalidateSession()

  const mainWindow = getMainWindowRef()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
  }

  logger.info('[IPC:Admin] Admin panel hidden, session invalidated')

  return { success: true }
}

export const handleAdminExitApp = createAdminAction(IPC_CHANNELS.ADMIN_EXIT_APP, async () => {
  logger.info('[IPC:Admin] Exit app requested')

  try {
    getWindowManager().destroyAdminWindow()
    app.quit()
    return { success: true, message: 'Application exiting' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Exit app failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

export const handleAdminRestartApp = createAdminAction(IPC_CHANNELS.ADMIN_RESTART_APP, async () => {
  logger.info('[IPC:Admin] Restart app requested')

  try {
    getWindowManager().destroyAdminWindow()
    app.relaunch()
    app.quit()
    return { success: true, message: 'Application restarting' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Restart app failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

export const handleAdminSystemRestart = createAdminAction(IPC_CHANNELS.ADMIN_SYSTEM_RESTART, async () => {
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

export const handleAdminSystemShutdown = createAdminAction(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN, async () => {
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

export const handleAdminGetConfig = createAdminAction(IPC_CHANNELS.ADMIN_GET_CONFIG, async () => {
  logger.debug('[IPC:Admin] Get config requested')

  try {
    let deviceNo: string | undefined
    try {
      const appConfig = loadConfig()
      deviceNo = appConfig.deviceNo
    } catch (error) {
      const err = error as Error
      logger.warn('[IPC:Admin] Failed to read app config, fallback to runtime info only', { error: err.message })
    }

    const data: Record<string, unknown> = {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      locale: app.getLocale(),
      appPath: app.getAppPath(),
      deviceNo: deviceNo ?? 'N/A',
    }

    return { success: true, data }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Get config failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

export const handleAdminGetSystemInfo = createAdminAction(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO, async () => {
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

export const handleAdminReloadBusiness = createAdminAction(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS, async () => {
  logger.info('[IPC:Admin] Reload business page requested')

  try {
    const mainWindow = getMainWindowRef()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, message: 'Main window not available' }
    }

    mainWindow.webContents.reload()
    return { success: true, message: 'Business page reloaded' }
  } catch (error) {
    const err = error as Error
    logger.error('[IPC:Admin] Reload business failed', { error: err.message })
    return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
  }
})

export function isValidHost(host: string): boolean {
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$/
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^[0-9a-fA-F:]+$/

  return hostnameRegex.test(host) || ipv4Regex.test(host) || ipv6Regex.test(host)
}

export const handleAdminTestNetwork = createAdminAction(
  IPC_CHANNELS.ADMIN_NETWORK_TEST,
  async (_event, host: string, count = 4) => {
    logger.info('[IPC:Admin] Test network requested', { host })

    if (!isValidHost(host)) {
      logger.warn('[IPC:Admin] Test network rejected: invalid host', { host })
      return { success: false, message: 'Invalid host parameter' }
    }

    try {
      const platform = os.platform()
      const command = platform === 'win32' ? `ping -n ${count} ${host}` : `ping -c ${count} ${host}`
      const { stdout } = await execAsync(command)
      return parsePingResult(stdout, host, platform)
    } catch (error) {
      const err = error as Error
      logger.error('[IPC:Admin] Test network failed', { error: err.message })
      return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
    }
  },
)

export function parsePingResult(output: string, host: string, platform: string): AdminNetworkTestResult {
  let sent = 0
  let received = 0
  let packetLoss = 0
  let minTime = 0
  let maxTime = 0
  let avgTime = 0

  if (platform === 'win32') {
    const sentMatch = output.match(/已发送 = (\d+)/)
    const receivedMatch = output.match(/已接收 = (\d+)/)
    const lossMatch = output.match(/丢失 = (\d+)/)

    sent = sentMatch ? parseInt(sentMatch[1]!, 10) : 0
    received = receivedMatch ? parseInt(receivedMatch[1]!, 10) : 0
    const lost = lossMatch ? parseInt(lossMatch[1]!, 10) : 0
    packetLoss = sent > 0 ? (lost / sent) * 100 : 0

    const timeMatch = output.match(/最短 = (\d+)ms，最长 = (\d+)ms，平均 = (\d+)ms/)
    if (timeMatch) {
      minTime = parseInt(timeMatch[1]!, 10)
      maxTime = parseInt(timeMatch[2]!, 10)
      avgTime = parseInt(timeMatch[3]!, 10)
    }
  } else {
    const statsMatch = output.match(/(\d+) packets transmitted, (\d+)(?: packets)? received, ([\d.]+)% packet loss/)
    if (statsMatch) {
      sent = parseInt(statsMatch[1]!, 10)
      received = parseInt(statsMatch[2]!, 10)
      packetLoss = parseFloat(statsMatch[3]!)
    }

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

export const handleAdminBusinessStatus = createAdminAction(
  IPC_CHANNELS.ADMIN_BUSINESS_STATUS,
  async (_event, url: string) => {
    logger.info('[IPC:Admin] Check business network status requested', { url })

    if (!isValidHost(url)) {
      logger.warn('[IPC:Admin] Check business status rejected: invalid URL', { url })
      return { success: false, message: 'Invalid URL parameter' }
    }

    try {
      const start = performance.now()
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      })
      const end = performance.now()

      return {
        success: true,
        latency: Math.round(end - start),
        isOnline: response.ok,
        statusCode: response.status,
      }
    } catch {
      return {
        success: false,
        message: 'Network error',
        latency: 9999,
        isOnline: false,
        statusCode: 0,
      }
    }
  },
)

export async function handleAdminCollectHardwareInfo(
  _event: Electron.IpcMainInvokeEvent,
  config?: Partial<HardwareInfoConfig>,
) {
  return handleCollectHardwareInfo(config)
}
