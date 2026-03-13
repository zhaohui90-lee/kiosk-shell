import { app } from 'electron'
import type { WindowConfig } from '../../types'

/**
 * Strategy接口，每种环境（开发、生产）实现不同的窗口配置和行为
 */
export interface WindowStrategy {

  getBaseConfig(): Partial<WindowConfig>

  shouldFocusOnReady(): boolean

  shouldOpenDevToolsOnReady(): boolean

  isDevToolsAllowed(): boolean

  shouldBlockNewWindows(): boolean
}

/**
 * 生产环境窗口策略
 */
export class KioskStrategy implements WindowStrategy {
  getBaseConfig(): Partial<WindowConfig> {
    return {
      fullscreen: true,
      kiosk: true,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      devTools: false,
      sandbox: true,
      backgroundColor: '#FFFFFF',
    }
  }

  shouldFocusOnReady(): boolean {
    return true
  }

  shouldOpenDevToolsOnReady(): boolean {
    return false
  }

  isDevToolsAllowed(): boolean {
    return false
  }

  shouldBlockNewWindows(): boolean {
    return true
  }
}

/**
 * 开发环境窗口策略
 */
export class DevStrategy implements WindowStrategy {
  getBaseConfig(): Partial<WindowConfig> {
    return {
      fullscreen: false,
      kiosk: false,
      frame: true,
      resizable: true,
      skipTaskbar: false,
      alwaysOnTop: false,
      devTools: true,
      sandbox: false,
    }
  }

  shouldFocusOnReady(): boolean {
    return true
  }

  shouldOpenDevToolsOnReady(): boolean {
    return true
  }

  isDevToolsAllowed(): boolean {
    return true
  }

  shouldBlockNewWindows(): boolean {
    return false
  }
}

export function createStrategy(): WindowStrategy {
  if (app.isPackaged) {
    return new KioskStrategy()
  }
  return new DevStrategy()
}
