/**
 * Debug IPC handlers
 * Handles DevTools and other debug operations
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getLogger } from '@kiosk/logger';
import { IPC_CHANNELS, type DebugResult } from '../types';
import { DEFAULT_DEBUG_PASSWORD, ERROR_MESSAGES } from '../constants';
import { checkRateLimit } from '../rate-limiter';

const logger = getLogger();

/**
 * Debug password (can be overridden via configuration)
 */
let debugPassword = DEFAULT_DEBUG_PASSWORD;

/**
 * Set custom debug password
 * Should be called during app initialization with a secure password
 */
export function setDebugPassword(password: string): void {
  if (password && password.length >= 8) {
    debugPassword = password;
    logger.info('[IPC:Debug] Debug password updated');
  } else {
    logger.warn('[IPC:Debug] Invalid password provided, keeping existing');
  }
}

/**
 * Verify debug password
 */
function verifyPassword(password: string): boolean {
  return password === debugPassword;
}

/**
 * Handle open DevTools request
 */
async function handleOpenDevTools(
  event: Electron.IpcMainInvokeEvent,
  password: string
): Promise<DebugResult> {
  const channel = IPC_CHANNELS.OPEN_DEV_TOOLS;

  // Check rate limit
  if (!checkRateLimit(channel)) {
    logger.warn('[IPC:Debug] DevTools request rate limited');
    return {
      success: false,
      message: ERROR_MESSAGES.RATE_LIMITED,
    };
  }

  logger.info('[IPC:Debug] Processing DevTools request');

  // Verify password
  if (!verifyPassword(password)) {
    logger.warn('[IPC:Debug] Invalid password attempt');
    return {
      success: false,
      message: ERROR_MESSAGES.INVALID_PASSWORD,
    };
  }

  try {
    // Get the window that sent the IPC message
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);

    if (!win) {
      logger.error('[IPC:Debug] Could not find window for DevTools');
      return {
        success: false,
        message: 'Could not find window',
      };
    }

    // Open DevTools
    win.webContents.openDevTools({ mode: 'detach' });

    logger.info('[IPC:Debug] DevTools opened successfully');
    return {
      success: true,
      message: 'DevTools opened',
    };
  } catch (error) {
    const err = error as Error;
    logger.error('[IPC:Debug] Failed to open DevTools', { error: err.message });
    return {
      success: false,
      message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}`,
    };
  }
}

/**
 * Register debug IPC handlers
 */
export function registerDebugHandlers(): void {
  logger.debug('[IPC:Debug] Registering debug handlers');

  ipcMain.handle(IPC_CHANNELS.OPEN_DEV_TOOLS, handleOpenDevTools);

  logger.debug('[IPC:Debug] Debug handlers registered');
}

/**
 * Unregister debug IPC handlers
 */
export function unregisterDebugHandlers(): void {
  logger.debug('[IPC:Debug] Unregistering debug handlers');

  ipcMain.removeHandler(IPC_CHANNELS.OPEN_DEV_TOOLS);

  logger.debug('[IPC:Debug] Debug handlers unregistered');
}

export { handleOpenDevTools };
