/**
 * Window management module
 * WindowManager facade that composes MainWindow and AdminWindow,
 * plus singleton helpers for the application.
 */

import type { BrowserWindow } from 'electron'
import type { WindowConfig, AdminWindowConfig } from './types'
import { MainWindow } from './main-window'
import { AdminWindow } from './admin-window'

/**
 * WindowManager — facade that composes MainWindow and AdminWindow.
 * Preserves the same public API for all existing consumers.
 */
export class WindowManager {
  private main: MainWindow
  private admin: AdminWindow

  constructor(config: WindowConfig = {}) {
    this.main = new MainWindow(config)
    this.admin = new AdminWindow()
  }

  // --- Main Window ---

  createWindow(): BrowserWindow {
    return this.main.create()
  }

  getWindow(): BrowserWindow | null {
    return this.main.getWindow()
  }

  isWindowValid(): boolean {
    return this.main.isValid()
  }

  async loadURL(url: string): Promise<void> {
    return this.main.loadURL(url)
  }

  async loadFile(filePath: string): Promise<void> {
    return this.main.loadFile(filePath)
  }

  enterFullscreen(): void {
    this.main.enterFullscreen()
  }

  exitFullscreen(): void {
    this.main.exitFullscreen()
  }

  toggleFullscreen(): void {
    this.main.toggleFullscreen()
  }

  enterKioskMode(): void {
    this.main.enterKioskMode()
  }

  exitKioskMode(): void {
    this.main.exitKioskMode()
  }

  openDevTools(): void {
    this.main.openDevTools()
  }

  closeDevTools(): void {
    this.main.closeDevTools()
  }

  toggleDevTools(): void {
    this.main.toggleDevTools()
  }

  reload(): void {
    this.main.reload()
  }

  forceReload(): void {
    this.main.forceReload()
  }

  close(): void {
    this.main.close()
  }

  focus(): void {
    this.main.focus()
  }

  getConfig(): WindowConfig {
    return this.main.getConfig()
  }

  updateConfig(newConfig: Partial<WindowConfig>): void {
    this.main.updateConfig(newConfig)
  }

  // --- Admin Window ---

  createAdminWindow(config: AdminWindowConfig = {}): BrowserWindow {
    return this.admin.create(config)
  }

  showAdminWindow(): void {
    this.admin.show()
  }

  hideAdminWindow(): void {
    this.admin.hide()
  }

  toggleAdminWindow(): void {
    this.admin.toggle()
  }

  getAdminWindow(): BrowserWindow | null {
    return this.admin.getWindow()
  }

  isAdminWindowValid(): boolean {
    return this.admin.isValid()
  }

  destroyAdminWindow(): void {
    this.admin.destroy()
  }

  // --- Lifecycle ---

  destroy(): void {
    this.main.destroy()
    this.admin.destroy()
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
