/**
 * Window management module
 * WindowManager composes MainWindow and AdminWindow,
 * exposing them directly via readonly properties.
 */

import type { WindowConfig } from './types'
import { MainWindow } from './main-window'
import { AdminWindow } from './admin-window'

/**
 * WindowManager — composes MainWindow and AdminWindow.
 * Access sub-windows directly via `mainWindow` and `adminWindow` properties.
 */
export class WindowManager {
  readonly mainWindow: MainWindow
  readonly adminWindow: AdminWindow

  constructor(config: WindowConfig = {}) {
    this.mainWindow = new MainWindow(config)
    this.adminWindow = new AdminWindow()
  }

  /**
   * Destroy both windows
   */
  destroy(): void {
    this.mainWindow.destroy()
    this.adminWindow.destroy()
  }
}

// Singleton instance
let windowManager: WindowManager | null = null

/**
 * Get the WindowManager singleton
 */
export function getWindowManager(config?: WindowConfig): WindowManager {
  if (!windowManager) {
    windowManager = new WindowManager(config)
  }
  return windowManager
}

/**
 * Reset the WindowManager (useful for testing)
 */
export function resetWindowManager(): void {
  if (windowManager) {
    windowManager.destroy()
    windowManager = null
  }
}

/**
 * Create a new WindowManager instance (for custom configurations)
 */
export function createWindowManager(config?: WindowConfig): WindowManager {
  return new WindowManager(config)
}
