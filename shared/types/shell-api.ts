/**
 * ShellAPI type definitions
 * API exposed to renderer via contextBridge
 */

export interface DeviceInfo {
  uuid: string;
  platform: 'win32' | 'darwin';
  arch: string;
  hostname: string;
  version: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export interface ShellAPI {
  /** Get device information */
  getDeviceInfo(): Promise<DeviceInfo>;

  /** Request update check */
  requestUpdate(): Promise<UpdateInfo>;

  /** System shutdown (requires password in kiosk mode) */
  systemShutdown(password?: string): Promise<void>;

  /** System restart (requires password in kiosk mode) */
  systemRestart(password?: string): Promise<void>;

  /** Open DevTools (requires password) */
  openDevTools(password: string): Promise<boolean>;

  /** Trigger admin panel (fires IPC event to main process) */
  triggerAdmin(): void;
}

declare global {
  interface Window {
    shellAPI: ShellAPI;
  }
}
