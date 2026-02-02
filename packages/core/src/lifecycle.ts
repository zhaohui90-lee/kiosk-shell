/**
 * Lifecycle management module
 * Handles Electron app events, single instance lock, and exit flows
 */

import { app, BrowserWindow } from 'electron';
import { getLogger } from '@kiosk/logger';
import type { LifecycleEvent, LifecycleHandler, AppState } from './types';

const logger = getLogger().child('core:lifecycle');

/**
 * LifecycleManager class
 * Manages application lifecycle events and state
 */
export class LifecycleManager {
  private state: AppState = {
    isReady: false,
    isQuitting: false,
    mainWindow: null,
    activeSlot: 'slot-a',
  };

  private handlers: Map<LifecycleEvent, LifecycleHandler[]> = new Map();
  private singleInstanceLock = false;
  private isInitialized = false;

  /**
   * Initialize the lifecycle manager
   * Sets up core event handlers
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.warn('LifecycleManager already initialized');
      return;
    }

    logger.info('Initializing LifecycleManager');

    this.setupAppEvents();
    this.isInitialized = true;

    logger.info('LifecycleManager initialized');
  }

  /**
   * Request single instance lock
   * Returns false if another instance is already running
   */
  requestSingleInstanceLock(): boolean {
    if (this.singleInstanceLock) {
      return true;
    }

    const gotLock = app.requestSingleInstanceLock();

    if (!gotLock) {
      logger.warn('Another instance is already running, quitting');
      app.quit();
      return false;
    }

    this.singleInstanceLock = true;
    logger.info('Single instance lock acquired');

    // Handle second instance attempt
    app.on('second-instance', (_event, commandLine, workingDirectory) => {
      logger.info('Second instance detected', { commandLine, workingDirectory });
      this.emit('second-instance', commandLine, workingDirectory);

      // Focus existing window
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    });

    return true;
  }

  /**
   * Setup core app event handlers
   */
  private setupAppEvents(): void {
    // App ready
    app.on('ready', () => {
      logger.info('App ready');
      this.state.isReady = true;
      this.emit('ready');
    });

    // All windows closed
    app.on('window-all-closed', () => {
      logger.info('All windows closed');
      this.emit('window-all-closed');

      // On macOS, apps typically stay active until explicit quit
      // But for kiosk mode, we should quit
      if (process.platform !== 'darwin' || this.isKioskMode()) {
        logger.info('Quitting app');
        app.quit();
      }
    });

    // Before quit
    app.on('before-quit', (event) => {
      logger.info('Before quit');
      this.state.isQuitting = true;
      this.emit('before-quit', event);
    });

    // Will quit
    app.on('will-quit', (event) => {
      logger.info('Will quit');
      this.emit('will-quit', event);
    });

    // Quit
    app.on('quit', (_event, exitCode) => {
      logger.info('App quit', { exitCode });
      this.emit('quit', exitCode);
    });

    // Activate (macOS)
    app.on('activate', () => {
      logger.info('App activated');
      this.emit('activate');

      // Re-create window if none exist (macOS behavior)
      if (BrowserWindow.getAllWindows().length === 0) {
        this.emit('activate');
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
    });
  }

  /**
   * Register a lifecycle event handler
   */
  on(event: LifecycleEvent, handler: LifecycleHandler): void {
    const handlers = this.handlers.get(event) ?? [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  /**
   * Remove a lifecycle event handler
   */
  off(event: LifecycleEvent, handler: LifecycleHandler): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit a lifecycle event
   */
  private emit(event: LifecycleEvent, ...args: unknown[]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (error) {
        const err = error as Error;
        logger.error('Lifecycle handler error', { event, error: err.message });
      }
    }
  }

  /**
   * Wait for app to be ready
   */
  async whenReady(): Promise<void> {
    if (this.state.isReady) {
      return;
    }
    await app.whenReady();
    this.state.isReady = true;
  }

  /**
   * Check if app is ready
   */
  isReady(): boolean {
    return this.state.isReady;
  }

  /**
   * Check if app is quitting
   */
  isQuitting(): boolean {
    return this.state.isQuitting;
  }

  /**
   * Check if running in kiosk mode
   */
  isKioskMode(): boolean {
    // Check environment variable or window state
    return process.env['KIOSK_MODE'] === '1' ||
           process.env['NODE_ENV'] === 'production';
  }

  /**
   * Quit the application
   */
  quit(): void {
    logger.info('Quitting application');
    this.state.isQuitting = true;
    app.quit();
  }

  /**
   * Exit immediately without cleanup
   */
  exit(exitCode = 0): void {
    logger.info('Exiting application', { exitCode });
    app.exit(exitCode);
  }

  /**
   * Relaunch the application
   */
  relaunch(): void {
    logger.info('Relaunching application');
    app.relaunch();
    app.quit();
  }

  /**
   * Get current app state
   */
  getState(): AppState {
    return { ...this.state };
  }

  /**
   * Set main window reference
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.state.mainWindow = window;
  }

  /**
   * Get main window reference
   */
  getMainWindow(): BrowserWindow | null {
    return this.state.mainWindow as BrowserWindow | null;
  }

  /**
   * Update active slot
   */
  setActiveSlot(slot: 'slot-a' | 'slot-b'): void {
    this.state.activeSlot = slot;
  }

  /**
   * Get app version
   */
  getVersion(): string {
    return app.getVersion();
  }

  /**
   * Get app name
   */
  getName(): string {
    return app.getName();
  }

  /**
   * Get app path
   */
  getAppPath(): string {
    return app.getAppPath();
  }

  /**
   * Get user data path
   */
  getUserDataPath(): string {
    return app.getPath('userData');
  }

  /**
   * Check if app is packaged
   */
  isPackaged(): boolean {
    return app.isPackaged;
  }

  /**
   * Hide the application (macOS)
   */
  hide(): void {
    if (process.platform === 'darwin') {
      app.hide();
    }
  }

  /**
   * Show the application (macOS)
   */
  show(): void {
    if (process.platform === 'darwin') {
      app.show();
    }
  }

  /**
   * Set app as login item (auto-start)
   */
  setLoginItemSettings(openAtLogin: boolean): void {
    logger.info('Setting login item', { openAtLogin });
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: true,
    });
  }

  /**
   * Get login item settings
   */
  getLoginItemSettings(): { openAtLogin: boolean } {
    return app.getLoginItemSettings();
  }
}

// Singleton instance
let lifecycleManager: LifecycleManager | null = null;

/**
 * Get the LifecycleManager singleton
 */
export function getLifecycleManager(): LifecycleManager {
  if (!lifecycleManager) {
    lifecycleManager = new LifecycleManager();
  }
  return lifecycleManager;
}

/**
 * Reset the LifecycleManager (useful for testing)
 */
export function resetLifecycleManager(): void {
  lifecycleManager = null;
}

/**
 * Create a new LifecycleManager instance
 */
export function createLifecycleManager(): LifecycleManager {
  return new LifecycleManager();
}
