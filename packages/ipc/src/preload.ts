/**
 * Preload script for kiosk-shell
 * Exposes shellAPI to renderer via contextBridge
 *
 * SECURITY: This script runs in the renderer process with limited Node.js access.
 * All API methods must use ipcRenderer.invoke() to communicate with main process.
 */

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, AdminBusinessNetworkStatus, ShellAPI } from './types'
import { SHELL_API_NAMESPACE } from './constants'
import type { DeviceInfo, UpdateInfo } from '@kiosk/shared'

/**
 * Shell API implementation
 * All methods invoke IPC handlers in the main process
 */
const shellAPI: ShellAPI = {
  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_DEVICE_INFO)
  },

  /**
   * Request update check
   */
  async requestUpdate(): Promise<UpdateInfo> {
    return ipcRenderer.invoke(IPC_CHANNELS.REQUEST_UPDATE)
  },

  /**
   * System shutdown
   * @param token - Admin session token
   */
  async systemShutdown(token: string): Promise<void> {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SHUTDOWN, token)
    if (!result.success) {
      throw new Error(result.message || 'Shutdown failed')
    }
  },

  /**
   * System restart
   * @param token - Admin session token
   */
  async systemRestart(token: string): Promise<void> {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_RESTART, token)
    if (!result.success) {
      throw new Error(result.message || 'Restart failed')
    }
  },

  /**
   * Open DevTools
   * @param password - Required password for debug access
   */
  async openDevTools(password: string): Promise<boolean> {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.OPEN_DEV_TOOLS, password)
    return result.success
  },

  /**
   * Trigger admin panel
   * Fires a one-way IPC event to main process to show the admin window
   */
  triggerAdmin(): void {
    ipcRenderer.send(IPC_CHANNELS.ADMIN_TRIGGER)
  },

  /**
   * 获取业务网络状态
   * @param token 管理员token
   * @param url 业务地址
   */
  async checkBusinessStatus(token: string, url: string): Promise<AdminBusinessNetworkStatus> {
    return await ipcRenderer.invoke(IPC_CHANNELS.ADMIN_BUSINESS_STATUS, token, url)
  },
}

/**
 * Check if running in preload context
 * contextBridge is only available in the preload script context
 */
function isPreloadContext(): boolean {
  return typeof contextBridge !== 'undefined' && contextBridge !== null
}

/**
 * Expose shellAPI to renderer window via contextBridge
 * This ensures context isolation while providing secure API access
 */
function exposeShellAPI(): void {
  if (!isPreloadContext()) {
    // Not in preload context (e.g., main process import), skip
    return
  }

  try {
    contextBridge.exposeInMainWorld(SHELL_API_NAMESPACE, shellAPI)
    console.log('[Preload] shellAPI exposed successfully')
  } catch (error) {
    console.error('[Preload] Failed to expose shellAPI:', error)
  }
}

// Auto-expose when script loads (only in preload context)
exposeShellAPI()

/**
 * Admin trigger click zone configuration
 */
const CLICK_ZONE_CONFIG = {
  /** Size of the invisible click zone in pixels */
  size: 50,
  /** Number of consecutive clicks required */
  clickThreshold: 5,
  /** Time window for consecutive clicks in milliseconds */
  timeWindowMs: 2000,
}

/**
 * Inject a hidden click zone at the bottom-left corner of the page.
 * When tapped consecutively (5 times within 2 seconds), triggers the admin panel.
 * This enables admin access on kiosk devices without an external keyboard.
 */
function injectAdminTriggerZone(): void {
  if (!isPreloadContext()) return

  document.addEventListener('DOMContentLoaded', () => {
    const clickTimestamps: number[] = []

    const zone = document.createElement('div')
    zone.id = '__kiosk_admin_trigger'
    zone.style.cssText = [
      'position: fixed',
      'left: 0',
      'bottom: 0',
      `width: ${CLICK_ZONE_CONFIG.size}px`,
      `height: ${CLICK_ZONE_CONFIG.size}px`,
      'z-index: 2147483647',
      'background: transparent',
      'cursor: default',
      '-webkit-tap-highlight-color: transparent',
      'touch-action: manipulation',
      'user-select: none',
    ].join('; ')

    zone.addEventListener('click', () => {
      const now = Date.now()
      clickTimestamps.push(now)

      // Remove clicks outside time window
      while (clickTimestamps.length > 0 && now - clickTimestamps[0]! > CLICK_ZONE_CONFIG.timeWindowMs) {
        clickTimestamps.shift()
      }

      if (clickTimestamps.length >= CLICK_ZONE_CONFIG.clickThreshold) {
        clickTimestamps.length = 0
        console.log('[Preload] Admin trigger activated via click zone')
        ipcRenderer.send(IPC_CHANNELS.ADMIN_TRIGGER)
      }
    })

    document.body.appendChild(zone)
    console.log('[Preload] Admin trigger click zone injected')
  })
}

// Inject click zone for admin trigger
injectAdminTriggerZone()

export { shellAPI, exposeShellAPI, injectAdminTriggerZone, CLICK_ZONE_CONFIG }
