/**
 * Device information IPC handlers
 */

import { ipcMain } from 'electron';
import { app } from 'electron';
import { getLogger } from '@kiosk/logger';
import { getPlatformAdapter } from '@kiosk/platform';
import {
  getDeviceUuidAsync,
  isUuidManagerInitialized,
  initUuidManager,
} from '@kiosk/device';
import { IPC_CHANNELS, type DeviceInfoResult } from '../types';

const logger = getLogger();

/**
 * Get device UUID from @kiosk/device module
 * Ensures UUID manager is initialized before retrieving UUID
 * Returns 'N/A' as fallback if UUID retrieval fails
 */
async function getDeviceUuid(): Promise<string> {
  try {
    if (!isUuidManagerInitialized()) {
      await initUuidManager();
    }
    return await getDeviceUuidAsync();
  } catch (error) {
    const err = error as Error;
    logger.error('[IPC:Device] Failed to get device UUID', { error: err.message });
    return 'N/A';
  }
}

/**
 * Handle get device info request
 */
async function handleGetDeviceInfo(
  _event: Electron.IpcMainInvokeEvent
): Promise<DeviceInfoResult> {
  logger.debug('[IPC:Device] Processing get device info request');

  try {
    const platform = getPlatformAdapter();
    const systemInfo = platform.getSystemInfo();

    const uuid = await getDeviceUuid();

    const deviceInfo: DeviceInfoResult = {
      uuid,
      platform: systemInfo.platform,
      arch: systemInfo.arch,
      hostname: systemInfo.hostname,
      version: app.getVersion(),
    };

    logger.info('[IPC:Device] Device info retrieved', {
      uuid: deviceInfo.uuid,
      platform: deviceInfo.platform,
      arch: deviceInfo.arch,
    });
    return deviceInfo;
  } catch (error) {
    const err = error as Error;
    logger.error('[IPC:Device] Failed to get device info', { error: err.message });
    throw new Error(`Failed to get device info: ${err.message}`);
  }
}

/**
 * Register device IPC handlers
 */
export function registerDeviceHandlers(): void {
  logger.debug('[IPC:Device] Registering device handlers');

  ipcMain.handle(IPC_CHANNELS.GET_DEVICE_INFO, handleGetDeviceInfo);

  logger.debug('[IPC:Device] Device handlers registered');
}

/**
 * Unregister device IPC handlers
 */
export function unregisterDeviceHandlers(): void {
  logger.debug('[IPC:Device] Unregistering device handlers');

  ipcMain.removeHandler(IPC_CHANNELS.GET_DEVICE_INFO);

  logger.debug('[IPC:Device] Device handlers unregistered');
}

export { handleGetDeviceInfo };
