import type { BrowserWindowConstructorOptions } from 'electron'

export class WindowOptionsBuilder {
  private options: BrowserWindowConstructorOptions = {}

  constructor() {
    this.options = {
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    }
  }

  widthSize(width: number, height: number): this {
    this.options.width = width
    this.options.height = height
    return this
  }

  /**
   * kiosk模式
   * 开启kiosk模式时，alwaysOnTop 和 skipTaskbar 必须同步开启
   */
  withKiosk(enabled: boolean): this {
    this.options.kiosk = enabled
    this.options.alwaysOnTop = enabled
    this.options.skipTaskbar = enabled
    return this
  }

  withFullscreen(enabled: boolean): this {
    this.options.fullscreen = enabled
    return this
  }

  /**
   * 无边框模式
   * 开启无边框模式时，resizable必须同步关闭，否则会有边框残影
   */
  withFrame(enabled: boolean): this {
    this.options.resizable = enabled
    this.options.frame = enabled
    return this
  }

  withResizable(enabled: boolean): this {
    this.options.resizable = enabled
    return this
  }

  withAlwaysOnTop(enabled: boolean): this {
    this.options.alwaysOnTop = enabled
    return this
  }

  withBackgroundColor(color: string): this {
    this.options.backgroundColor = color
    return this
  }

  withCenter(enabled: boolean): this {
    this.options.center = enabled
    return this
  }

  /**
   * 安全沙箱
   */
  withSandbox(enabled: boolean): this {
    this.options.webPreferences = {
      ...this.options.webPreferences,
      sandbox: enabled,
    }
    return this
  }

  withDevTools(enabled: boolean): this {
    this.options.webPreferences = {
      ...this.options.webPreferences,
      devTools: enabled,
    }
    return this
  }

  /**
   * preload脚本
   */
  withPreload(preloadPath: string): this {
    this.options.webPreferences = {
      ...this.options.webPreferences,
      preload: preloadPath,
    }
    return this
  }

  /**
   * 额外参数
   */
  withExtraOptions(extraOptions: Partial<BrowserWindowConstructorOptions>): this {
    const { webPreferences: extraWebPrefs, ...rest } = extraOptions

    this.options = {
      ...this.options,
      ...rest,
    }

    if (extraWebPrefs) {
      this.options.webPreferences = {
        ...this.options.webPreferences,
        ...extraWebPrefs,
      }
    }

    return this
  }

  /**
   * 构建
   */
  build(): BrowserWindowConstructorOptions {
    // 这里做一次深拷贝 防止外部参数修改影响到已创建的窗口
    return {
      ...this.options,
      webPreferences: {
        ...this.options.webPreferences,
      },
    }
  }
}
