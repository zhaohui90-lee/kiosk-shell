/**
 * macOS (Darwin) platform adapter implementation
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

export class DarwinAdapter implements PlatformAdapter {
  private blockedShortcuts: string[] = [];
  private kioskModeEnabled = false;

  getPlatform(): Platform {
    return 'darwin';
  }

  getSystemInfo(): SystemInfo {
    return {
      platform: 'darwin',
      arch: os.arch(),
      hostname: os.hostname(),
      release: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
    };
  }

  async shutdown(options: ShutdownOptions = {}): Promise<void> {
    const { delay = 0 } = options;

    // On macOS, use osascript to trigger shutdown
    // Note: Requires admin privileges in production
    const script = delay > 0
      ? `do shell script "sleep ${delay} && shutdown -h now" with administrator privileges`
      : 'tell application "System Events" to shut down';

    try {
      await execAsync(`osascript -e '${script}'`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to shutdown: ${err.message}`);
    }
  }

  async restart(options: RestartOptions = {}): Promise<void> {
    const { delay = 0 } = options;

    // On macOS, use osascript to trigger restart
    const script = delay > 0
      ? `do shell script "sleep ${delay} && shutdown -r now" with administrator privileges`
      : 'tell application "System Events" to restart';

    try {
      await execAsync(`osascript -e '${script}'`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to restart: ${err.message}`);
    }
  }

  blockShortcuts(config: ShortcutConfig): void {
    this.blockedShortcuts = [...config.blocked];

    // Note: In a real Electron environment, this would use
    // electron.globalShortcut.register() to block shortcuts.
    // macOS doesn't have system shortcuts like Ctrl+Alt+Delete,
    // but Command+Q (quit) and other shortcuts can be intercepted.
    //
    // This implementation stores the configuration for use by the
    // Electron main process.

    if (!config.allowDevTools) {
      // Block DevTools shortcuts
      if (!this.blockedShortcuts.includes('F12')) {
        this.blockedShortcuts.push('F12');
      }
      if (!this.blockedShortcuts.includes('Cmd+Option+I')) {
        this.blockedShortcuts.push('Cmd+Option+I');
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

    // On macOS, kiosk mode typically involves:
    // 1. Fullscreen mode (handled by Electron BrowserWindow)
    // 2. Blocking shortcuts like Command+Q, Command+Tab
    // 3. Optional: Using macOS's native kiosk mode (10.6+)
    //    - System Preferences > Users & Groups > Login Options
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
      // Use open command on macOS
      await execAsync(`open "${url}"`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to open URL: ${err.message}`);
    }
  }

  getAppDataPath(): string {
    // On macOS, app data is typically in ~/Library/Application Support
    return path.join(os.homedir(), 'Library', 'Application Support', 'kiosk-shell');
  }

  getUserDataPath(): string {
    // Same as app data path on macOS for Electron apps
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
