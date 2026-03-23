/**
 * Device IPC handlers
 * Handles device information queries
 */

import { app, ipcMain } from 'electron'
import { getLogger } from '@kiosk/logger'
import { getDeviceUuidAsync, loadConfig } from '@kiosk/device'
import { getPlatformAdapter } from '@kiosk/platform'
import { IPC_CHANNELS, type DeviceInfoResult } from '../../types'

const logger = getLogger()

export async function handleGetDeviceInfo(
  _event: Electron.IpcMainInvokeEvent,
): Promise<DeviceInfoResult> {
  logger.debug('[IPC:Device] Get device info requested')

  const systemInfo = getPlatformAdapter().getSystemInfo()

  let uuid = 'N/A'
  try {
    uuid = await getDeviceUuidAsync()
  } catch (error) {
    logger.warn('[IPC:Device] Failed to load device UUID, using fallback', {
      error: (error as Error).message,
    })
  }

  let deviceId = 'N/A'
  try {
    deviceId = loadConfig().deviceNo || 'N/A'
  } catch (error) {
    logger.warn('[IPC:Device] Failed to load device config, using fallback', {
      error: (error as Error).message,
    })
  }

  return {
    uuid,
    deviceId,
    platform: systemInfo.platform as DeviceInfoResult['platform'],
    arch: systemInfo.arch,
    hostname: systemInfo.hostname,
    version: app.getVersion(),
  }
}

export function registerDeviceHandlers(): void {
  logger.debug('[IPC:Device] Registering device handlers')
  ipcMain.handle(IPC_CHANNELS.GET_DEVICE_INFO, handleGetDeviceInfo)
  logger.debug('[IPC:Device] Device handlers registered')
}

export function unregisterDeviceHandlers(): void {
  logger.debug('[IPC:Device] Unregistering device handlers')
  ipcMain.removeHandler(IPC_CHANNELS.GET_DEVICE_INFO)
  logger.debug('[IPC:Device] Device handlers unregistered')
}
