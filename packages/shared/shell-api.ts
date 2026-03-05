/**
 * ShellAPI type definitions
 * API exposed to renderer via contextBridge
 */

export interface DeviceInfo {
  uuid: string
  deviceId: string
  platform: 'win32' | 'darwin'
  arch: string
  hostname: string
  version: string
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
}

export interface SystemResource {
  /** % 0-100 */
  cpuUsage: number
  /** MB */
  memFree: number
  /** MB */
  memTotal: number
  /** GB */
  diskUsed: number
  /** GB */
  diskTotal: number
  /** CPU temperature °C */
  temperature: number
}
