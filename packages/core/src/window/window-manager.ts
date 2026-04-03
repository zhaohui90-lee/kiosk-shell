import type { BrowserWindow } from 'electron'
import { getLogger } from '@kiosk/logger'
import { AdminWindowController } from './controller/admin-window-controller'
import { MainWindowController } from './controller/main-window-controller'
import { createStrategy } from './strategy/window-strategy'
import type { AdminWindowConfig, WindowConfig } from '../types'

const logger = getLogger().child('core:window')

export class WindowManager {
  private readonly main: MainWindowController
  private readonly admin: AdminWindowController

  constructor(config: WindowConfig = {}) {
    const strategy = createStrategy(config)

    logger.info('Initializing WindowManager', {
      strategy: strategy.constructor.name,
    })

    this.main = new MainWindowController(strategy, config)
    this.admin = new AdminWindowController({
      onShow: () => this.showMainWindowInteractionMask(),
      onHide: () => this.restoreMainWindowAfterAdmin(),
    })
  }

  createWindow(): BrowserWindow {
    return this.main.create()
  }

  getWindow(): BrowserWindow | null {
    return this.main.getWindow()
  }

  isValid(): boolean {
    return this.main.isValid()
  }

  async loadURL(url: string): Promise<void> {
    return this.main.loadURL(url)
  }

  async loadFile(filePath: string): Promise<void> {
    return this.main.loadFile(filePath)
  }

  /** 全屏 */

  enterFullscreen(): void {
    this.main.enterFullscreen()
  }

  exitFullscreen(): void {
    this.main.exitFullscreen()
  }

  toggleFullscreen(): void {
    this.main.toggleFullscreen()
  }

  /** kiosk模式控制 */

  enterKioskMode(): void {
    this.main.enterKioskMode()
  }

  exitKioskMode(): void {
    this.main.exitKioskMode()
  }

  /** devTools */

  openDevTools(): void {
    this.main.openDevTools()
  }

  closeDevTools(): void {
    this.main.closeDevTools()
  }

  toggleDevTools(): void {
    this.main.toggleDevTools()
  }

  /** 重载 */

  reload(): void {
    this.main.reload()
  }

  forceReload(): void {
    this.main.forceReload()
  }

  focus(): void {
    this.main.focus()
  }

  /** 状态查询 */

  isKioskMode(): boolean {
    return this.main.isKioskMode()
  }

  // ---- Admin窗口 ----

  createAdminWindow(config: AdminWindowConfig): BrowserWindow {
    const parentWindow = config.parent ?? this.main.getWindow()

    return this.admin.create({
      ...config,
      ...(parentWindow ? { parent: parentWindow } : {}),
    })
  }

  getAdminWindow(): BrowserWindow | null {
    return this.admin.getWindow()
  }

  isAdminWindowValid(): boolean {
    return this.admin.isValid()
  }

  showAdminWindow(isDev: boolean): void {
    this.admin.show(isDev)
  }

  hideAdminWindow(): void {
    this.admin.hide()
  }

  toggleAdminWindow(isDev: boolean): void {
    this.admin.toggle(isDev)
  }

  destroyAdminWindow(): void {
    this.admin.destroy()
    this.restoreMainWindowAfterAdmin()
  }

  // ---- 全局销毁 ----

  destroy(): void {
    logger.info('Destroying WindowManager')
    this.main.hideInteractionMask()
    this.main.destroy()
    this.admin.destroy()
  }

  private showMainWindowInteractionMask(): void {
    this.main.showInteractionMask()
  }

  private restoreMainWindowAfterAdmin(): void {
    this.main.hideInteractionMask()
    this.focusMainWindowAfterAdmin()
  }

  private focusMainWindowAfterAdmin(): void {
    if (!this.main.isValid()) {
      return
    }

    this.main.focus()
  }
}

// ---- 单例 ----

let instance: WindowManager | null = null

/**
 * 获取 WindowManager 单例
 * config 仅首次调用时生效
 */
export function getWindowManager(config?: WindowConfig): WindowManager {
  if (!instance) {
    instance = new WindowManager(config)
  }
  return instance
}

/**
 * 重置 WindowManager 单例（用于测试）
 */
export function resetWindowManager(): void {
  if (instance) {
    instance.destroy()
    instance = null
  }
}

/**
 * 创建新的 WindowManager 实例（用于自定义配置）
 */
export function createWindowManager(config?: WindowConfig): WindowManager {
  return new WindowManager(config)
}
