import { BrowserWindow } from 'electron'
import { getLogger } from '@kiosk/logger'
import { loadConfig } from '@kiosk/device'
import type { AdminWindowConfig } from '../../types'
import { WindowEventHandler } from '../handler/window-event-handler'
import { WindowOptionsBuilder } from '../builder/window-options-builder'

const logger = getLogger().child('core:window:admin')

interface AdminWindowVisibilityHooks {
  onShow?: () => void
  onHide?: () => void
}

export class AdminWindowController {
  private window: BrowserWindow | null = null
  private savedConfig: AdminWindowConfig = {}
  private readonly eventHandler: WindowEventHandler
  private readonly visibilityHooks: AdminWindowVisibilityHooks

  constructor(visibilityHooks: AdminWindowVisibilityHooks = {}) {
    this.eventHandler = new WindowEventHandler()
    this.visibilityHooks = visibilityHooks
  }

  /**
   * 创建 Admin 窗口 默认关闭
   */
  create(config: AdminWindowConfig): BrowserWindow {
    this.savedConfig = config

    if (this.isValid()) {
      logger.warn('Admin window already exists, returning existing instance')
      return this.window!
    }

    const appConfig = loadConfig()
    const width = config.width ?? appConfig.width
    const height = config.height ?? 768

    const builder = new WindowOptionsBuilder()
      .withSize(width, height)
      .withKiosk(false)
      .withFrame(false)
      .withResizable(true)
      .withAlwaysOnTop(true)
      .withCenter(true)
      .withBackgroundColor('#1a1a2e')
      .withSandbox(true)
      .withDevTools(true)
      .withExtraOptions({
        skipTaskbar: true,
        fullscreenable: false,
        maximizable: false,
        minimizable: false,
        ...(config.parent ? { parent: config.parent } : {}),
      })

    if (config.preload) {
      builder.withPreload(config.preload)
    }

    const options = builder.build()

    logger.info('Creating admin window', { width, height })

    this.window = new BrowserWindow(options)
    this.configureOverlayWindow()

    // 将「隐藏自身」的逻辑以回调形式传入 EventHandler
    // EventHandler 不需要持有 AdminWindowController 的引用
    this.eventHandler.setupAdminWindow(this.window, () => this.hide())

    if (config.loadFile) {
      logger.info('Loading admin window content', {
        path: config.loadFile,
      })
      this.window.loadFile(config.loadFile).catch((err) => {
        logger.error(`Failed to load admin content: ${err}`)
      })
    }

    return this.window
  }

  /**
   * 强制销毁窗口
   */
  destroy(): void {
    if (!this.window) return

    logger.info('Destroying admin window')
    // 先移除事件监听
    this.window.removeAllListeners('close')

    if (!this.window.isDestroyed()) {
      this.window.destroy()
    }

    this.window = null
  }

  /** 控制显示 */

  show(isDev: boolean): void {
    if (!this.isValid()) {
      logger.info('Admin window invalid, recreating...')
      this.create(this.savedConfig)
    }

    if (!this.isValid()) return

    logger.info('Showing admin window')
    this.configureOverlayWindow()
    this.window!.show()
    this.window!.moveTop()
    this.window!.focus()
    this.visibilityHooks.onShow?.()

    // Admin 面板显示时 判断是否开启devTools
    if (isDev) {
      this.window!.webContents.openDevTools({ mode: 'detach' })
      logger.debug('Admin DevTools opened')
    }
  }

  /**
   * 隐藏窗口
   * 同时关闭devTools
   */
  hide(): void {
    if (!this.isValid()) return

    if (this.window!.webContents.isDevToolsOpened()) {
      this.window!.webContents.closeDevTools()
      logger.debug('Admin DevTools closed')
    }
    logger.debug('Hiding admin window')
    this.window!.hide()
    this.visibilityHooks.onHide?.()
  }

  /**
   * 切换 Admin 窗口可见性
   */
  toggle(isDev: boolean): void {
    if (!this.isValid()) {
      this.show(isDev)
      return
    }

    this.isVisible() ? this.hide() : this.show(isDev)
  }

  /** 状态查询 */

  getWindow(): BrowserWindow | null {
    return this.window
  }

  isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed()
  }

  isVisible(): boolean {
    return this.isValid() && this.window!.isVisible()
  }

  private configureOverlayWindow(): void {
    if (!this.window || this.window.isDestroyed()) return

    this.window.setAlwaysOnTop(true, 'screen-saver')
    this.window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    })
  }
}
