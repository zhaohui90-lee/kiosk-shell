/**
 * Window management module
 * Handles BrowserWindow creation, fullscreen, and devTools control
 */

import { BrowserWindow, screen } from 'electron';
import type { BrowserWindowConstructorOptions } from 'electron';
import { getLogger } from '@kiosk/logger';
import type { WindowConfig } from './types';

const logger = getLogger().child('core:window');

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
};

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
};

/**
 * Check if running in development mode
 */
function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
}

/**
 * Merge configurations with defaults
 */
function mergeConfig(userConfig: WindowConfig = {}): WindowConfig {
  const baseConfig = isDev()
    ? { ...DEFAULT_CONFIG, ...DEV_CONFIG }
    : DEFAULT_CONFIG;

  return { ...baseConfig, ...userConfig };
}

/**
 * WindowManager class
 * Manages the main BrowserWindow instance
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private config: WindowConfig;

  constructor(config: WindowConfig = {}) {
    this.config = mergeConfig(config);
  }

  /**
   * Create and return the main window
   */
  createWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      logger.warn('Main window already exists, returning existing instance');
      return this.mainWindow;
    }

    const { width, height } = this.getWindowSize();

    const windowOptions: BrowserWindowConstructorOptions = {
      width,
      height,
      fullscreen: this.config.fullscreen,
      kiosk: this.config.kiosk,
      frame: this.config.frame,
      resizable: this.config.resizable,
      skipTaskbar: this.config.skipTaskbar,
      alwaysOnTop: this.config.alwaysOnTop,
      backgroundColor: this.config.backgroundColor,
      show: false, // Show after ready-to-show event
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: this.config.preload,
        devTools: this.config.devTools,
      },
      ...this.config.additionalOptions,
    };

    logger.info('Creating main window', {
      width,
      height,
      fullscreen: this.config.fullscreen,
      kiosk: this.config.kiosk,
    });

    this.mainWindow = new BrowserWindow(windowOptions);

    this.setupWindowEvents();

    return this.mainWindow;
  }

  /**
   * Get window dimensions based on screen size
   */
  private getWindowSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // In kiosk/fullscreen mode, use full screen size
    if (this.config.fullscreen || this.config.kiosk) {
      const { width, height } = primaryDisplay.size;
      return { width, height };
    }

    // In development mode, use configured size or 80% of screen
    const width = this.config.width ?? Math.floor(screenWidth * 0.8);
    const height = this.config.height ?? Math.floor(screenHeight * 0.8);

    return { width, height };
  }

  /**
   * Setup window event handlers
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      logger.info('Window ready to show');
      this.mainWindow?.show();

      // Focus window in kiosk mode
      if (this.config.kiosk || this.config.alwaysOnTop) {
        this.mainWindow?.focus();
      }
    });

    // Handle window close
    this.mainWindow.on('closed', () => {
      logger.info('Window closed');
      this.mainWindow = null;
    });

    // Prevent new windows from being created
    this.mainWindow.webContents.setWindowOpenHandler(() => {
      logger.warn('Blocked attempt to open new window');
      return { action: 'deny' };
    });

    // Log navigation events
    this.mainWindow.webContents.on('did-navigate', (_event, url) => {
      logger.info('Window navigated', { url });
    });

    // Log load failures
    this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      logger.error('Window failed to load', {
        errorCode,
        errorDescription,
        url: validatedURL,
      });
    });
  }

  /**
   * Get the main window instance
   */
  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Check if window exists and is not destroyed
   */
  isWindowValid(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed();
  }

  /**
   * Load a URL into the window
   */
  async loadURL(url: string): Promise<void> {
    if (!this.isWindowValid()) {
      throw new Error('Cannot load URL: window is not valid');
    }

    logger.info('Loading URL', { url });
    await this.mainWindow!.loadURL(url);
  }

  /**
   * Load a local file into the window
   */
  async loadFile(filePath: string): Promise<void> {
    if (!this.isWindowValid()) {
      throw new Error('Cannot load file: window is not valid');
    }

    logger.info('Loading file', { filePath });
    await this.mainWindow!.loadFile(filePath);
  }

  /**
   * Enter fullscreen mode
   */
  enterFullscreen(): void {
    if (!this.isWindowValid()) return;

    logger.info('Entering fullscreen');
    this.mainWindow!.setFullScreen(true);
  }

  /**
   * Exit fullscreen mode
   */
  exitFullscreen(): void {
    if (!this.isWindowValid()) return;

    logger.info('Exiting fullscreen');
    this.mainWindow!.setFullScreen(false);
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(): void {
    if (!this.isWindowValid()) return;

    const isFullscreen = this.mainWindow!.isFullScreen();
    logger.info('Toggling fullscreen', { currentState: isFullscreen });
    this.mainWindow!.setFullScreen(!isFullscreen);
  }

  /**
   * Enter kiosk mode
   */
  enterKioskMode(): void {
    if (!this.isWindowValid()) return;

    logger.info('Entering kiosk mode');
    this.mainWindow!.setKiosk(true);
    this.mainWindow!.setAlwaysOnTop(true);
    this.mainWindow!.setSkipTaskbar(true);
  }

  /**
   * Exit kiosk mode
   */
  exitKioskMode(): void {
    if (!this.isWindowValid()) return;

    logger.info('Exiting kiosk mode');
    this.mainWindow!.setKiosk(false);
    this.mainWindow!.setAlwaysOnTop(false);
    this.mainWindow!.setSkipTaskbar(false);
  }

  /**
   * Open DevTools (requires devTools enabled in config)
   */
  openDevTools(): void {
    if (!this.isWindowValid()) return;

    if (!this.config.devTools) {
      logger.warn('DevTools are disabled in configuration');
      return;
    }

    logger.info('Opening DevTools');
    this.mainWindow!.webContents.openDevTools();
  }

  /**
   * Close DevTools
   */
  closeDevTools(): void {
    if (!this.isWindowValid()) return;

    logger.info('Closing DevTools');
    this.mainWindow!.webContents.closeDevTools();
  }

  /**
   * Toggle DevTools
   */
  toggleDevTools(): void {
    if (!this.isWindowValid()) return;

    if (!this.config.devTools) {
      logger.warn('DevTools are disabled in configuration');
      return;
    }

    const isOpen = this.mainWindow!.webContents.isDevToolsOpened();
    logger.info('Toggling DevTools', { currentState: isOpen });

    if (isOpen) {
      this.closeDevTools();
    } else {
      this.openDevTools();
    }
  }

  /**
   * Reload the window content
   */
  reload(): void {
    if (!this.isWindowValid()) return;

    logger.info('Reloading window');
    this.mainWindow!.webContents.reload();
  }

  /**
   * Force reload ignoring cache
   */
  forceReload(): void {
    if (!this.isWindowValid()) return;

    logger.info('Force reloading window (ignoring cache)');
    this.mainWindow!.webContents.reloadIgnoringCache();
  }

  /**
   * Close the window
   */
  close(): void {
    if (!this.isWindowValid()) return;

    logger.info('Closing window');
    this.mainWindow!.close();
  }

  /**
   * Destroy the window
   */
  destroy(): void {
    if (!this.mainWindow) return;

    logger.info('Destroying window');
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.destroy();
    }
    this.mainWindow = null;
  }

  /**
   * Focus the window
   */
  focus(): void {
    if (!this.isWindowValid()) return;

    this.mainWindow!.focus();
  }

  /**
   * Get current configuration
   */
  getConfig(): WindowConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (does not affect existing window)
   */
  updateConfig(newConfig: Partial<WindowConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Configuration updated', { config: this.config });
  }
}

// Singleton instance
let windowManager: WindowManager | null = null;

/**
 * Get the WindowManager singleton
 */
export function getWindowManager(config?: WindowConfig): WindowManager {
  if (!windowManager) {
    windowManager = new WindowManager(config);
  }
  return windowManager;
}

/**
 * Reset the WindowManager (useful for testing)
 */
export function resetWindowManager(): void {
  if (windowManager) {
    windowManager.destroy();
    windowManager = null;
  }
}

/**
 * Create a new WindowManager instance (for custom configurations)
 */
export function createWindowManager(config?: WindowConfig): WindowManager {
  return new WindowManager(config);
}
