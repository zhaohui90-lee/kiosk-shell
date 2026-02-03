/**
 * Device information IPC handlers
 */

import { ipcMain } from 'electron';
import { app } from 'electron';
import { getLogger } from '@kiosk/logger';
import { getPlatformAdapter } from '@kiosk/platform';
import { IPC_CHANNELS, type DeviceInfoResult } from '../types';

const logger = getLogger();

/**
 * Generate or retrieve device UUID
 * In production, this should be persisted and managed by @kiosk/device module
 */
function getDeviceUuid(): string {
  // Placeholder: In production, use @kiosk/device module for UUID management
  // For now, generate a simple hash based on machine ID
  const platform = getPlatformAdapter();
  const systemInfo = platform.getSystemInfo();
  const machineId = `${systemInfo.hostname}-${systemInfo.platform}-${systemInfo.arch}`;

  // Simple hash function for demo purposes
  let hash = 0;
  for (let i = 0; i < machineId.length; i++) {
    const char = machineId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `kiosk-${Math.abs(hash).toString(16).padStart(8, '0')}`;
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

    const deviceInfo: DeviceInfoResult = {
      uuid: getDeviceUuid(),
      platform: systemInfo.platform,
      arch: systemInfo.arch,
      hostname: systemInfo.hostname,
      version: app.getVersion(),
    };

    logger.debug('[IPC:Device] Device info retrieved', { uuid: deviceInfo.uuid });
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
