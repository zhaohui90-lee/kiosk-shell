/**
 * Main window management
 * Handles the primary BrowserWindow with kiosk mode, fullscreen, and DevTools
 */

import { BrowserWindow, screen, type BrowserWindowConstructorOptions } from 'electron'
import { getLogger } from '@kiosk/logger'
import type { WindowConfig } from './types'

const logger = getLogger().child('core:main-window')

/**
 * Default window configuration for kiosk mode
 */
const DEFAULT_CONFIG: WindowConfig = {
  width: 1920,
  height: 1080,
  fullscreen: true,
  kiosk: true,
  frame: false,
  resizable: false,
  skipTaskbar: true,
  alwaysOnTop: true,
  devTools: false,
  backgroundColor: '#FFFFFF',
}

/**
 * Development mode configuration
 */
const DEV_CONFIG: Partial<WindowConfig> = {
  fullscreen: false,
  kiosk: false,
  frame: true,
  resizable: true,
  skipTaskbar: false,
  alwaysOnTop: false,
  devTools: true,
  sandbox: false,
}

function isDev(): boolean {
  return process.env['NODE_ENV'] === 'development' || process.env['ELECTRON_IS_DEV'] === '1'
}

function mergeConfig(userConfig: WindowConfig = {}): WindowConfig {
  const baseConfig = isDev() ? { ...DEFAULT_CONFIG, ...DEV_CONFIG } : DEFAULT_CONFIG
  return { ...baseConfig, ...userConfig }
}

/**
 * MainWindow — manages the primary kiosk BrowserWindow
 */
export class MainWindow {
  private window: BrowserWindow | null = null
  private config: WindowConfig

  constructor(config: WindowConfig = {}) {
    this.config = mergeConfig(config)
  }

  create(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      logger.warn('Main window already exists, returning existing instance')
      return this.window
    }

    const { width, height } = this.getWindowSize()

    const windowOptions: BrowserWindowConstructorOptions = {
      width,
      height,
      fullscreen: this.config.fullscreen ?? true,
      kiosk: this.config.kiosk ?? true,
      frame: this.config.frame ?? false,
      resizable: this.config.resizable ?? false,
      skipTaskbar: this.config.skipTaskbar ?? true,
      alwaysOnTop: this.config.alwaysOnTop ?? true,
      backgroundColor: this.config.backgroundColor ?? '#FFFFFF',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: this.config.sandbox ?? true,
        devTools: this.config.devTools ?? false,
        ...(this.config.preload ? { preload: this.config.preload } : {}),
      },
      ...this.config.additionalOptions,
    }

    logger.info('Creating main window', {
      width,
      height,
      fullscreen: this.config.fullscreen,
      kiosk: this.config.kiosk,
    })

    this.window = new BrowserWindow(windowOptions)
    this.setupEvents()

    return this.window
  }

  private getWindowSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

    if (this.config.fullscreen || this.config.kiosk) {
      const { width, height } = primaryDisplay.size
      return { width, height }
    }

    const width = this.config.width ?? Math.floor(screenWidth * 0.8)
    const height = this.config.height ?? Math.floor(screenHeight * 0.8)

    return { width, height }
  }

  private setupEvents(): void {
    if (!this.window) return

    this.window.once('ready-to-show', () => {
      logger.info('Window ready to show')
      this.window?.show()

      if (this.config.kiosk || this.config.alwaysOnTop) {
        this.window?.focus()
      }
    })

    this.window.on('closed', () => {
      logger.info('Window closed')
      this.window = null
    })

    this.window.webContents.setWindowOpenHandler(() => {
      logger.warn('Blocked attempt to open new window')
      return { action: 'deny' }
    })

    this.window.webContents.on('did-navigate', (_event, url) => {
      logger.info('Window navigated', { url })
    })

    this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      logger.error('Window failed to load', {
        errorCode,
        errorDescription,
        url: validatedURL,
      })
    })
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }

  isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed()
  }

  async loadURL(url: string): Promise<void> {
    if (!this.isValid()) {
      throw new Error('Cannot load URL: window is not valid')
    }
    logger.info('Loading URL', { url })
    await this.window!.loadURL(url)
  }

  async loadFile(filePath: string): Promise<void> {
    if (!this.isValid()) {
      throw new Error('Cannot load file: window is not valid')
    }
    logger.info('Loading file', { filePath })
    await this.window!.loadFile(filePath)
  }

  enterFullscreen(): void {
    if (!this.isValid()) return
    logger.info('Entering fullscreen')
    this.window!.setFullScreen(true)
  }

  exitFullscreen(): void {
    if (!this.isValid()) return
    logger.info('Exiting fullscreen')
    this.window!.setFullScreen(false)
  }

  toggleFullscreen(): void {
    if (!this.isValid()) return
    const isFullscreen = this.window!.isFullScreen()
    logger.info('Toggling fullscreen', { currentState: isFullscreen })
    this.window!.setFullScreen(!isFullscreen)
  }

  enterKioskMode(): void {
    if (!this.isValid()) return
    logger.info('Entering kiosk mode')
    this.window!.setKiosk(true)
    this.window!.setAlwaysOnTop(true)
    this.window!.setSkipTaskbar(true)
  }

  exitKioskMode(): void {
    if (!this.isValid()) return
    logger.info('Exiting kiosk mode')
    this.window!.setKiosk(false)
    this.window!.setAlwaysOnTop(false)
    this.window!.setSkipTaskbar(false)
  }

  openDevTools(): void {
    if (!this.isValid()) return
    if (!this.config.devTools) {
      logger.warn('DevTools are disabled in configuration')
      return
    }
    logger.info('Opening DevTools')
    this.window!.webContents.openDevTools()
  }

  closeDevTools(): void {
    if (!this.isValid()) return
    logger.info('Closing DevTools')
    this.window!.webContents.closeDevTools()
  }

  toggleDevTools(): void {
    if (!this.isValid()) return
    if (!this.config.devTools) {
      logger.warn('DevTools are disabled in configuration')
      return
    }
    const isOpen = this.window!.webContents.isDevToolsOpened()
    logger.info('Toggling DevTools', { currentState: isOpen })
    if (isOpen) {
      this.closeDevTools()
    } else {
      this.openDevTools()
    }
  }

  reload(): void {
    if (!this.isValid()) return
    logger.info('Reloading window')
    this.window!.webContents.reload()
  }

  forceReload(): void {
    if (!this.isValid()) return
    logger.info('Force reloading window (ignoring cache)')
    this.window!.webContents.reloadIgnoringCache()
  }

  close(): void {
    if (!this.isValid()) return
    logger.info('Closing window')
    this.window!.close()
  }

  destroy(): void {
    if (!this.window) return
    logger.info('Destroying window')
    if (!this.window.isDestroyed()) {
      this.window.destroy()
    }
    this.window = null
  }

  focus(): void {
    if (!this.isValid()) return
    this.window!.focus()
  }

  getConfig(): WindowConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<WindowConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('Configuration updated', { config: this.config })
  }
}
