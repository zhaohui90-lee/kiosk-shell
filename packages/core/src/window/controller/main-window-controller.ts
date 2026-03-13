import { BrowserWindow, screen } from 'electron'
import { getLogger } from '@kiosk/logger'
import { WindowStrategy } from '../strategy/window-strategy'
import { WindowEventHandler } from '../handler/window-event-handler'
import type { WindowConfig } from '../../types'
import { WindowOptionsBuilder } from '../builder/window-options-builder'

const logger = getLogger().child('core:window:main')

export class MainWindowController {
  private window: BrowserWindow | null = null
  private readonly strategy: WindowStrategy
  private readonly eventHandler: WindowEventHandler
  private readonly userConfig: WindowConfig

  constructor(strategy: WindowStrategy, userConfig: WindowConfig) {
    this.strategy = strategy
    this.userConfig = userConfig
    this.eventHandler = new WindowEventHandler()
  }

  /**
   * 创建窗口
   * 如果已存在直接返回
   */
  create(): BrowserWindow {
    if (this.isValid()) {
      logger.warn('Main window already exists, returning existing instance')
      return this.window!
    }

    const options = this.buildWindowOptions()

    logger.info('Creating main window', {
      width: options.width,
      height: options.height,
      fullscreen: options.fullscreen,
      kiosk: options.kiosk,
    })

    this.window = new BrowserWindow(options)
    this.eventHandler.setupMainWindow(this.window, this.strategy, () => {
      this.window = null
    })

    return this.window
  }

  /**
   * 关闭窗口 触发close事件
   */
  close(): void {
    if (!this.isValid()) return
    logger.info('Closing window')
    this.window!.close()
  }

  /**
   * 销毁窗口 绕过close事件
   */
  destroy(): void {
    if (!this.window) return
    logger.info('Destroying window')
    if (!this.window.isDestroyed()) {
      this.window.destroy()
    }
    this.window = null
  }

  /** 内容加载 */

  async loadURL(url: string): Promise<void> {
    this.assertValid('loadURL')
    logger.info('Loading URL', { url })
    await this.window!.loadURL(url)
  }

  async loadFile(filePath: string): Promise<void> {
    this.assertValid('loadFile')
    logger.info('Loading file', { filePath })
    await this.window!.loadFile(filePath)
  }

  /** 全屏控制 */

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
    const current = this.window!.isFullScreen()
    logger.info('Toggling fullscreen', { current })
    this.window!.setFullScreen(!current)
  }

  /** kiosk模式控制 */

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

  exitAlwaysOnTop(): void {
    if (!this.isKioskMode()) return
    logger.info('Exiting always on top')
    this.window!.setAlwaysOnTop(false)
  }

  /** devTools */

  openDevTools(): void {
    if (!this.isValid()) return

    if (!this.strategy.isDevToolsAllowed()) {
      logger.warn('DevTools are disabled by current strategy')
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

    if (!this.strategy.isDevToolsAllowed()) {
      logger.warn('DevTools are disabled by current strategy')
      return
    }

    const isOpen = this.window!.webContents.isDevToolsOpened()
    logger.info('Toggling DevTools', { isOpen })
    isOpen ? this.closeDevTools() : this.openDevTools()
  }

  /** 重载 */

  reload(): void {
    if (!this.isValid()) return
    logger.info('Reloading window')
    this.window!.webContents.reload()
  }

  forceReload(): void {
    if (!this.isValid()) return
    logger.info('Force reloading window')
    this.window!.webContents.reloadIgnoringCache()
  }

  /** 焦点 */

  focus(): void {
    if (!this.isValid()) return
    this.window!.focus()
  }

  /** 状态查询 */

  getWindow(): BrowserWindow | null {
    return this.window
  }

  isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed()
  }

  isKioskMode(): boolean {
    return this.isValid() && this.window!.isAlwaysOnTop()
  }

  /**
   * 通过builder来构建窗口配置
   * 优先级：用户配置 → 策略基础配置 → Builder安全默认
   */
  private buildWindowOptions() {
    const baseConfig = this.strategy.getBaseConfig()
    const merged = { ...baseConfig, ...this.userConfig }

    const { width, height } = this.resolveWindowSize(merged)

    const builder = new WindowOptionsBuilder()
      .withSize(width, height)
      .withFullscreen(merged.fullscreen ?? true)
      .withKiosk(merged.kiosk ?? true)
      .withFrame(merged.frame ?? false)
      .withResizable(merged.resizable ?? false)
      .withAlwaysOnTop(merged.alwaysOnTop ?? true)
      .withBackgroundColor(merged.backgroundColor ?? '#FFFFFF')
      .withSandbox(merged.sandbox ?? true)
      .withDevTools(merged.devTools ?? false)

    if (merged.preload) {
      builder.withPreload(merged.preload)
    }

    if (merged.extraOptions) {
      builder.withExtraOptions(merged.extraOptions)
    }

    return builder.build()
  }

  /**
   * 根据模式解析实际窗口尺寸
   * kiosk/fullscreen 时使用物理屏幕尺寸
   * 开发模式时使用配置值或屏幕的 80%
   */
  private resolveWindowSize(config: WindowConfig): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay()

    if (config.fullscreen || config.kiosk) {
      return primaryDisplay.size
    }

    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize

    return {
      width: config.width ?? Math.floor(screenW * 0.8),
      height: config.height ?? Math.floor(screenH * 0.8),
    }
  }

  private assertValid(operation: string): void {
    if (!this.isValid()) {
      throw new Error(`Cannot perform '${operation}': main window is not valid`)
    }
  }
}
