/**
 * Admin window management
 * Handles the admin panel BrowserWindow with show/hide toggle and close intercept
 */

import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron'
import { getLogger } from '@kiosk/logger'
import { loadConfig } from '@kiosk/device'
import type { AdminWindowConfig } from './types'

const logger = getLogger().child('core:admin-window')

/**
 * AdminWindow — manages the admin panel BrowserWindow
 */
export class AdminWindow {
  private window: BrowserWindow | null = null
  private config: AdminWindowConfig = {}

  create(config: AdminWindowConfig = {}): BrowserWindow {
    this.config = config

    if (this.window && !this.window.isDestroyed()) {
      logger.warn('Admin window already exists, returning existing instance')
      return this.window
    }

    const appConfig = loadConfig()
    const width = config.width ?? appConfig.width
    const height = config.height ?? 768

    const windowOptions: BrowserWindowConstructorOptions = {
      width,
      height,
      show: false,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      center: true,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        devTools: true,
        ...(config.preload ? { preload: config.preload } : {}),
      },
    }

    logger.info('Creating admin window', { width, height })

    this.window = new BrowserWindow(windowOptions)
    this.setupEvents()

    // Auto load HTML file
    if (config.loadFile) {
      logger.info('Loading admin window content', { path: config.loadFile })
      this.window.loadFile(config.loadFile).catch((err) => {
        logger.error(`Failed to load admin content: ${err}`)
      })
    }

    return this.window
  }

  private setupEvents(): void {
    if (!this.window) return

    // Intercept close to hide instead of destroy
    this.window.on('close', (event) => {
      if (this.window && !this.window.isDestroyed()) {
        event.preventDefault()
        this.hide()
        logger.debug('Admin window hidden (close intercepted)')
      }
    })
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }

  isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed()
  }

  show(): void {
    // Rebuild the window if invalid or destroyed
    if (!this.isValid()) {
      logger.info('Admin window invalid or destroyed, recreating...')
      this.create(this.config)
    }

    // Check again after recreation
    if (this.window && !this.window.isDestroyed()) {
      logger.info('Showing admin window')
      this.window.show()
      this.window.focus()

      // Open DevTools with admin panel (admin panel has devTools: true)
      this.window.webContents.openDevTools({ mode: 'detach' })
      logger.debug('Admin DevTools opened')
    }
  }

  hide(): void {
    if (!this.isValid()) return

    // Close DevTools when admin panel hides
    if (this.window!.webContents.isDevToolsOpened()) {
      this.window!.webContents.closeDevTools()
      logger.debug('Admin DevTools closed')
    }

    logger.debug('Hiding admin window')
    this.window!.hide()
  }

  toggle(): void {
    if (!this.isValid()) {
      this.show()
      return
    }

    if (this.window!.isVisible()) {
      this.hide()
    } else {
      this.show()
    }
  }

  destroy(): void {
    if (!this.window) return

    logger.info('Destroying admin window')
    // Remove close event listener to avoid intercept
    this.window.removeAllListeners('close')
    if (!this.window.isDestroyed()) {
      this.window.destroy()
    }
    this.window = null
  }
}
