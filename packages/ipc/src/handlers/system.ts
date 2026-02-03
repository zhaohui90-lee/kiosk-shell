/**
 * System control IPC handlers
 * Handles shutdown and restart operations
 */

import { ipcMain } from 'electron';
import { getLogger } from '@kiosk/logger';
import { getPlatformAdapter } from '@kiosk/platform';
import { IPC_CHANNELS, type SystemShutdownResult, type SystemRestartResult } from '../types';
import { ERROR_MESSAGES } from '../constants';
import { checkRateLimit } from '../rate-limiter';

const logger = getLogger();

/**
 * Handle system shutdown request
 */
async function handleSystemShutdown(
  _event: Electron.IpcMainInvokeEvent,
  _password?: string
): Promise<SystemShutdownResult> {
  const channel = IPC_CHANNELS.SYSTEM_SHUTDOWN;

  // Check rate limit
  if (!checkRateLimit(channel)) {
    logger.warn('[IPC:System] Shutdown request rate limited');
    return {
      success: false,
      message: ERROR_MESSAGES.RATE_LIMITED,
    };
  }

  logger.info('[IPC:System] Processing shutdown request');

  try {
    const platform = getPlatformAdapter();

    // In kiosk mode, password verification would be required
    // This is handled by @kiosk/security module (to be implemented)

    await platform.shutdown({ force: false, delay: 5 });

    logger.info('[IPC:System] Shutdown initiated successfully');
    return {
      success: true,
      message: 'System shutdown initiated',
    };
  } catch (error) {
    const err = error as Error;
    logger.error('[IPC:System] Shutdown failed', { error: err.message });
    return {
      success: false,
      message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}`,
    };
  }
}

/**
 * Handle system restart request
 */
async function handleSystemRestart(
  _event: Electron.IpcMainInvokeEvent,
  _password?: string
): Promise<SystemRestartResult> {
  const channel = IPC_CHANNELS.SYSTEM_RESTART;

  // Check rate limit
  if (!checkRateLimit(channel)) {
    logger.warn('[IPC:System] Restart request rate limited');
    return {
      success: false,
      message: ERROR_MESSAGES.RATE_LIMITED,
    };
  }

  logger.info('[IPC:System] Processing restart request');

  try {
    const platform = getPlatformAdapter();

    // In kiosk mode, password verification would be required
    // This is handled by @kiosk/security module (to be implemented)

    await platform.restart({ force: false, delay: 5 });

    logger.info('[IPC:System] Restart initiated successfully');
    return {
      success: true,
      message: 'System restart initiated',
    };
  } catch (error) {
    const err = error as Error;
    logger.error('[IPC:System] Restart failed', { error: err.message });
    return {
      success: false,
      message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}`,
    };
  }
}

/**
 * Register system IPC handlers
 */
export function registerSystemHandlers(): void {
  logger.debug('[IPC:System] Registering system handlers');

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SHUTDOWN, handleSystemShutdown);
  ipcMain.handle(IPC_CHANNELS.SYSTEM_RESTART, handleSystemRestart);

  logger.debug('[IPC:System] System handlers registered');
}

/**
 * Unregister system IPC handlers
 */
export function unregisterSystemHandlers(): void {
  logger.debug('[IPC:System] Unregistering system handlers');

  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_SHUTDOWN);
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_RESTART);

  logger.debug('[IPC:System] System handlers unregistered');
}

export { handleSystemShutdown, handleSystemRestart };
