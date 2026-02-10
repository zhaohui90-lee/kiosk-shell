/**
 * Admin preload script for kiosk-shell
 * Exposes adminAPI to admin window renderer via contextBridge
 *
 * SECURITY: This script runs in the admin renderer process.
 * All API methods must use ipcRenderer.invoke() to communicate with main process.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './types';
import { ADMIN_API_NAMESPACE } from './constants';
import type { AdminLoginResult, AdminOperationResult } from './types';

/**
 * Admin API interface (exposed to admin window renderer)
 */
export interface AdminAPI {
  /** Login with admin password, returns session token */
  login(password: string): Promise<AdminLoginResult>;
  /** Exit the application */
  exitApp(token: string): Promise<AdminOperationResult>;
  /** Restart the application */
  restartApp(token: string): Promise<AdminOperationResult>;
  /** Restart the operating system */
  systemRestart(token: string): Promise<AdminOperationResult>;
  /** Shutdown the operating system */
  systemShutdown(token: string): Promise<AdminOperationResult>;
  /** Get current app config (read-only) */
  getConfig(token: string): Promise<AdminOperationResult>;
  /** Get system information */
  getSystemInfo(token: string): Promise<AdminOperationResult>;
  /** Reload business page */
  reloadBusiness(token: string): Promise<AdminOperationResult>;
}

/**
 * Admin API implementation
 */
const adminAPI: AdminAPI = {
  async login(password: string): Promise<AdminLoginResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_LOGIN, password);
  },

  async exitApp(token: string): Promise<AdminOperationResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_EXIT_APP, token);
  },

  async restartApp(token: string): Promise<AdminOperationResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_RESTART_APP, token);
  },

  async systemRestart(token: string): Promise<AdminOperationResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_SYSTEM_RESTART, token);
  },

  async systemShutdown(token: string): Promise<AdminOperationResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_SYSTEM_SHUTDOWN, token);
  },

  async getConfig(token: string): Promise<AdminOperationResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_GET_CONFIG, token);
  },

  async getSystemInfo(token: string): Promise<AdminOperationResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_GET_SYSTEM_INFO, token);
  },

  async reloadBusiness(token: string): Promise<AdminOperationResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.ADMIN_RELOAD_BUSINESS, token);
  },
};

/**
 * Check if running in preload context
 */
function isPreloadContext(): boolean {
  return typeof contextBridge !== 'undefined' && contextBridge !== null;
}

/**
 * Expose adminAPI to admin window renderer via contextBridge
 */
function exposeAdminAPI(): void {
  if (!isPreloadContext()) {
    return;
  }

  try {
    contextBridge.exposeInMainWorld(ADMIN_API_NAMESPACE, adminAPI);
    console.log('[AdminPreload] adminAPI exposed successfully');
  } catch (error) {
    console.error('[AdminPreload] Failed to expose adminAPI:', error);
  }
}

// Auto-expose when script loads
exposeAdminAPI();

export { adminAPI, exposeAdminAPI };
