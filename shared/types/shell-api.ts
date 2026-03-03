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

export interface BusinessNetworkStatus {
  latency: number
  isOnline: boolean
  statusCode: number
}

export interface ShellAPI {
  /** Get device information */
  getDeviceInfo(): Promise<DeviceInfo>

  /** Request update check */
  requestUpdate(): Promise<UpdateInfo>

  /** System shutdown (requires password in kiosk mode) */
  systemShutdown(password?: string): Promise<void>

  /** System restart (requires password in kiosk mode) */
  systemRestart(password?: string): Promise<void>

  /** Open DevTools (requires password) */
  openDevTools(password: string): Promise<boolean>

  /** Trigger admin panel (fires IPC event to main process) */
  triggerAdmin(): void

  /** 获取系统指标 */
  getSystemMertics(): Promise<SystemResource>

  /** 获取业务网络状态 */
  checkBusinessStatus(url: string): Promise<BusinessNetworkStatus>
}

declare global {
  interface Window {
    shellAPI: ShellAPI
  }
}
