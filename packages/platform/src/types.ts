/**
 * Platform module type definitions
 */

export type Platform = 'win32' | 'darwin';

export interface SystemInfo {
  platform: Platform;
  arch: string;
  hostname: string;
  release: string;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
}

export interface ShutdownOptions {
  /** Force shutdown without waiting for applications */
  force?: boolean;
  /** Delay in seconds before shutdown */
  delay?: number;
  /** Message to display (Windows only) */
  message?: string;
}

export interface RestartOptions {
  /** Force restart without waiting for applications */
  force?: boolean;
  /** Delay in seconds before restart */
  delay?: number;
  /** Message to display (Windows only) */
  message?: string;
}

export interface ShortcutConfig {
  /** Shortcuts to block (e.g., 'Alt+F4', 'Ctrl+Alt+Delete') */
  blocked: string[];
  /** Allow DevTools shortcut (F12, Ctrl+Shift+I) */
  allowDevTools?: boolean;
}

export interface PlatformAdapter {
  /** Get current platform identifier */
  getPlatform(): Platform;

  /** Get system information */
  getSystemInfo(): SystemInfo;

  /** Shutdown the system */
  shutdown(options?: ShutdownOptions): Promise<void>;

  /** Restart the system */
  restart(options?: RestartOptions): Promise<void>;

  /** Block system shortcuts */
  blockShortcuts(config: ShortcutConfig): void;

  /** Unblock all shortcuts */
  unblockShortcuts(): void;

  /** Check if running in kiosk mode */
  isKioskMode(): boolean;

  /** Enable kiosk mode */
  enableKioskMode(): Promise<void>;

  /** Disable kiosk mode */
  disableKioskMode(): Promise<void>;

  /** Open URL in default browser (for debug/admin purposes) */
  openExternal(url: string): Promise<void>;

  /** Get application data directory */
  getAppDataPath(): string;

  /** Get user data directory */
  getUserDataPath(): string;
}
