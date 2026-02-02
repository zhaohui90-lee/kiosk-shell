/**
 * Windows platform adapter implementation
 */

import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  Platform,
  PlatformAdapter,
  SystemInfo,
  ShutdownOptions,
  RestartOptions,
  ShortcutConfig,
} from '../types';

const execAsync = promisify(exec);

export class WindowsAdapter implements PlatformAdapter {
  private blockedShortcuts: string[] = [];
  private kioskModeEnabled = false;

  getPlatform(): Platform {
    return 'win32';
  }

  getSystemInfo(): SystemInfo {
    return {
      platform: 'win32',
      arch: os.arch(),
      hostname: os.hostname(),
      release: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
    };
  }

  async shutdown(options: ShutdownOptions = {}): Promise<void> {
    const { force = false, delay = 0, message } = options;

    const args: string[] = ['/s'];

    if (force) {
      args.push('/f');
    }

    args.push('/t', String(delay));

    if (message) {
      args.push('/c', `"${message}"`);
    }

    const command = `shutdown ${args.join(' ')}`;

    try {
      await execAsync(command);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to shutdown: ${err.message}`);
    }
  }

  async restart(options: RestartOptions = {}): Promise<void> {
    const { force = false, delay = 0, message } = options;

    const args: string[] = ['/r'];

    if (force) {
      args.push('/f');
    }

    args.push('/t', String(delay));

    if (message) {
      args.push('/c', `"${message}"`);
    }

    const command = `shutdown ${args.join(' ')}`;

    try {
      await execAsync(command);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to restart: ${err.message}`);
    }
  }

  blockShortcuts(config: ShortcutConfig): void {
    this.blockedShortcuts = [...config.blocked];

    // Note: In a real Electron environment, this would use
    // electron.globalShortcut.register() to block shortcuts.
    // For Windows, additional low-level keyboard hooks may be needed
    // for system shortcuts like Ctrl+Alt+Delete.
    //
    // This implementation stores the configuration for use by the
    // Electron main process.

    if (!config.allowDevTools) {
      // Block DevTools shortcuts
      if (!this.blockedShortcuts.includes('F12')) {
        this.blockedShortcuts.push('F12');
      }
      if (!this.blockedShortcuts.includes('Ctrl+Shift+I')) {
        this.blockedShortcuts.push('Ctrl+Shift+I');
      }
    }
  }

  unblockShortcuts(): void {
    this.blockedShortcuts = [];
    // In Electron, this would call globalShortcut.unregisterAll()
  }

  getBlockedShortcuts(): string[] {
    return [...this.blockedShortcuts];
  }

  isKioskMode(): boolean {
    return this.kioskModeEnabled;
  }

  async enableKioskMode(): Promise<void> {
    this.kioskModeEnabled = true;

    // On Windows, kiosk mode typically involves:
    // 1. Hiding the taskbar (handled by Electron BrowserWindow)
    // 2. Fullscreen mode (handled by Electron BrowserWindow)
    // 3. Blocking system shortcuts (handled by blockShortcuts)
    // 4. Optional: Registry modifications for Shell replacement
    //
    // The actual implementation will be coordinated with @kiosk/core
  }

  async disableKioskMode(): Promise<void> {
    this.kioskModeEnabled = false;
    this.unblockShortcuts();
  }

  async openExternal(url: string): Promise<void> {
    // Validate URL to prevent command injection
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    try {
      // Use start command on Windows
      await execAsync(`start "" "${url}"`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to open URL: ${err.message}`);
    }
  }

  getAppDataPath(): string {
    // On Windows, app data is typically in %APPDATA%
    const appData = process.env['APPDATA'];
    if (appData) {
      return path.join(appData, 'kiosk-shell');
    }
    // Fallback to user home directory
    return path.join(os.homedir(), 'AppData', 'Roaming', 'kiosk-shell');
  }

  getUserDataPath(): string {
    // Same as app data path on Windows for Electron apps
    return this.getAppDataPath();
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
