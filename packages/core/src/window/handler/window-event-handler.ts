import { getLogger } from '@kiosk/logger'
import { BrowserWindow } from 'electron'
import { WindowStrategy } from '../strategy/window-strategy'

/**
 * 为BrowserWindow绑定生命周期事件
 */
export class WindowEventHandler {
  private readonly logger = getLogger().child('core:window:admin')

  setupMainWindow(window: BrowserWindow, strategy: WindowStrategy) {
    this.setupReadyToShow(window, strategy)
    this.setupCloseHandler(window)
    this.setupNavigationGuard(window, strategy)
    this.setupNavigationLogger(window)
    this.setupLoadErrorHandler(window)
  }

  private setupReadyToShow(window: BrowserWindow, strategy: WindowStrategy): void {
    window.once('ready-to-show', () => {
      this.logger.info('Window ready to show')
      window.show()

      if (strategy.shouldFoucsOnReady()) {
        window.focus()
      }

      if (strategy.shouldOpenDevToolsOnReady()) {
        window.webContents.openDevTools()
      }
    })
  }

  private setupCloseHandler(window: BrowserWindow): void {
    window.on('closed', () => {
      this.logger.info('Window closed')
    })
  }

  private setupNavigationGuard(window: BrowserWindow, strategy: WindowStrategy): void {
    if (!strategy.shouldBlockNewWindows()) return

    window.webContents.setWindowOpenHandler(() => {
      this.logger.warn('Blocked attempt to open new window')
      return {
        action: 'deny',
      }
    })
  }

  private setupNavigationLogger(window: BrowserWindow): void {
    window.webContents.on('did-navigate', (_event, url) => {
      this.logger.info('Window navigated', { url })
    })
  }

  private setupLoadErrorHandler(window: BrowserWindow): void {
    window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      this.logger.error('Window failed to load', {
        errorCode,
        errorDescription,
        url: validatedURL,
      })
    })
  }
}
