/**
 * Preload script for kiosk-shell
 * Exposes shellAPI to renderer via contextBridge
 *
 * SECURITY: This script runs in the renderer process with limited Node.js access.
 * All API methods must use ipcRenderer.invoke() to communicate with main process.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './types';
import { SHELL_API_NAMESPACE } from './constants';
import type { ShellAPI, DeviceInfo, UpdateInfo } from '@kiosk/shared';

/**
 * Shell API implementation
 * All methods invoke IPC handlers in the main process
 */
const shellAPI: ShellAPI = {
  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_DEVICE_INFO);
  },

  /**
   * Request update check
   */
  async requestUpdate(): Promise<UpdateInfo> {
    return ipcRenderer.invoke(IPC_CHANNELS.REQUEST_UPDATE);
  },

  /**
   * System shutdown
   * @param password - Optional password for kiosk mode
   */
  async systemShutdown(password?: string): Promise<void> {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SHUTDOWN, password);
    if (!result.success) {
      throw new Error(result.message || 'Shutdown failed');
    }
  },

  /**
   * System restart
   * @param password - Optional password for kiosk mode
   */
  async systemRestart(password?: string): Promise<void> {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_RESTART, password);
    if (!result.success) {
      throw new Error(result.message || 'Restart failed');
    }
  },

  /**
   * Open DevTools
   * @param password - Required password for debug access
   */
  async openDevTools(password: string): Promise<boolean> {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.OPEN_DEV_TOOLS, password);
    return result.success;
  },

  /**
   * Trigger admin panel
   * Fires a one-way IPC event to main process to show the admin window
   */
  triggerAdmin(): void {
    ipcRenderer.send(IPC_CHANNELS.ADMIN_TRIGGER);
  },
};

/**
 * Check if running in preload context
 * contextBridge is only available in the preload script context
 */
function isPreloadContext(): boolean {
  return typeof contextBridge !== 'undefined' && contextBridge !== null;
}

/**
 * Expose shellAPI to renderer window via contextBridge
 * This ensures context isolation while providing secure API access
 */
function exposeShellAPI(): void {
  if (!isPreloadContext()) {
    // Not in preload context (e.g., main process import), skip
    return;
  }

  try {
    contextBridge.exposeInMainWorld(SHELL_API_NAMESPACE, shellAPI);
    console.log('[Preload] shellAPI exposed successfully');
  } catch (error) {
    console.error('[Preload] Failed to expose shellAPI:', error);
  }
}

// Auto-expose when script loads (only in preload context)
exposeShellAPI();

export { shellAPI, exposeShellAPI };
