/**
 * @kiosk/app - Main Process Entry
 * Kiosk shell application for medical self-service terminals
 *
 * This is the main entry point for the Electron application.
 * It initializes all modules and manages the application lifecycle.
 */

import { app, BrowserWindow, protocol, session, globalShortcut, ipcMain } from 'electron';
import { join } from 'path';

// Logger (initialize first)
import { initLogger, getLogger } from '@kiosk/logger';

// Core modules
import {
  getWindowManager,
  getProtocolHandler,
  getLifecycleManager,
  KIOSK_PROTOCOL,
} from '@kiosk/core';

// IPC handlers
import {
  registerAllHandlers,
  unregisterAllHandlers,
  setAdminPassword,
  setMainWindowRef,
  IPC_CHANNELS,
} from '@kiosk/ipc';

// Security
import { enableKioskMode } from '@kiosk/security';

// Recovery
import { startCrashMonitoring, startBlankDetection } from '@kiosk/recovery';

// Device
import { initUuidManager, getDeviceUuidAsync } from '@kiosk/device';

// Platform
import { getPlatformAdapter } from '@kiosk/platform';

// Configuration
import { loadConfig, ensureConfigFile, generateCSP, type AppConfig } from './config';

/**
 * Current configuration (loaded at startup)
 */
let config: AppConfig;

/**
 * Main window reference
 */
let mainWindow: BrowserWindow | null = null;

/**
 * Get logger instance
 */
function logger() {
  return getLogger();
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  logger().info('[main] Initializing Kiosk Shell...');

  // Initialize device UUID
  try {
    await initUuidManager();
    const uuid = await getDeviceUuidAsync();
    logger().info(`[main] Device UUID: ${uuid}`);
  } catch (error) {
    logger().error(`[main] Failed to initialize device UUID: ${String(error)}`);
  }

  // Get platform adapter
  const platform = getPlatformAdapter();
  logger().info(`[main] Platform: ${platform.getPlatform()}`);

  // Register custom protocol with resource path
  // In production: extraResources are at process.resourcesPath/renderer
  // In development: resources are at app.getAppPath()/resources/renderer
  const isProduction = app.isPackaged;
  const rendererPath = isProduction
    ? join(process.resourcesPath, 'renderer')
    : join(app.getAppPath(), 'resources', 'renderer');

  logger().info(`[main] Renderer path: ${rendererPath} (packaged: ${isProduction})`);

  const protocolHandler = getProtocolHandler(rendererPath);
  protocolHandler.register();
  logger().info(`[main] Registered ${KIOSK_PROTOCOL} protocol`);

  // Register IPC handlers
  registerAllHandlers();
  logger().info('[main] Registered IPC handlers');

  // Initialize lifecycle manager
  const lifecycleManager = getLifecycleManager();
  lifecycleManager.on('before-quit', () => {
    logger().info('[main] Application is quitting...');
    void cleanup();
  });
}

/**
 * Create the main window
 */
async function createMainWindow(): Promise<BrowserWindow> {
  logger().info('[main] Creating main window...');

  // Get preload script path
  const preloadPath = app.isPackaged
    ? join(app.getAppPath(), 'dist', 'preload', 'index.js')
    : join(__dirname, '..', 'preload', 'index.js');
  
  logger().info(`[main] Preload path calculated: ${preloadPath}`)

  // Create window configuration
  const windowConfig = {
    // Only include width/height when not in kiosk mode
    ...(config.kioskMode ? {} : { width: config.width, height: config.height }),
    fullscreen: config.kioskMode,
    kiosk: config.kioskMode,
    frame: !config.kioskMode,
    // Preload script path (used by WindowManager)
    preload: preloadPath,
    // Enable devTools based on config
    devTools: config.devMode,
  };

  // Get or create window manager with config
  const windowManager = getWindowManager(windowConfig);

  // Create window
  const window = windowManager.createWindow();
  logger().info(`[main] Created window with ID: ${window.id}`);

  // Enable kiosk mode if configured
  if (config.kioskMode) {
    const result = enableKioskMode(window, {
      fullscreen: true,
      alwaysOnTop: true,
      blockShortcuts: true,
      allowDevTools: config.devMode,
    });

    if (result.success) {
      logger().info('[main] Kiosk mode enabled');
    } else {
      logger().error(`[main] Failed to enable kiosk mode: ${result.error}`);
    }
  }

  // Start crash monitoring
  if (config.crashMonitoring) {
    startCrashMonitoring(window, {
      autoRestart: true,
      restartDelayMs: 2000,
    });
    logger().info('[main] Crash monitoring started');
  }

  // Start blank screen detection
  if (config.blankDetection) {
    startBlankDetection(window, {
      checkIntervalMs: 30000, // 30 seconds
      blankThreshold: 3,
    });
    logger().info('[main] Blank screen detection started');
  }

  // Load content
  await loadContent(window);

  // Open DevTools in development mode
  if (config.devMode) {
    window.webContents.openDevTools({ mode: 'detach' });
    logger().info('[main] DevTools opened (dev mode)');
  }

  return window;
}

/**
 * Load content into window
 */
async function loadContent(window: BrowserWindow): Promise<void> {
  const url = config.contentUrl;
  logger().info(`[main] Loading content: ${url}`);

  try {
    if (url.startsWith('kiosk://')) {
      // Use custom protocol
      await window.loadURL(url);
    } else if (url.startsWith('file://')) {
      // Load local file
      await window.loadURL(url);
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      // Load remote URL (for development)
      await window.loadURL(url);
    } else {
      // Treat as relative path to resources
      const resourcePath = join(app.getAppPath(), 'resources', 'renderer', url);
      await window.loadFile(resourcePath);
    }
    logger().info('[main] Content loaded successfully');
  } catch (error) {
    logger().error(`[main] Failed to load content: ${String(error)}`);
    // Load error page
    await loadErrorPage(window);
  }
}

/**
 * Load error page
 */
async function loadErrorPage(window: BrowserWindow): Promise<void> {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Kiosk Shell - Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: #eee;
          }
          .error-container {
            text-align: center;
            padding: 40px;
          }
          h1 { color: #e94560; margin-bottom: 20px; }
          p { color: #aaa; margin-bottom: 30px; }
          button {
            background: #e94560;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover { background: #ff6b6b; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Load Failed</h1>
          <p>Unable to load application content. Please check if resource files exist.</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body>
    </html>
  `;

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

/**
 * Setup admin panel window and triggers
 */
function setupAdminPanel(): void {
  logger().info('[main] Setting up admin panel...');

  const windowManager = getWindowManager();

  // Resolve admin preload path
  const adminPreloadPath = app.isPackaged
    ? join(app.getAppPath(), 'dist', 'preload', 'admin.js')
    : join(__dirname, '..', 'preload', 'admin.js');

  logger().info(`[main] Admin preload path: ${adminPreloadPath}`);

  // Create admin window (hidden)
  const adminWindow = windowManager.createAdminWindow({
    preload: adminPreloadPath,
  });

  // Load admin HTML
  const isProduction = app.isPackaged;
  const adminHtmlPath = isProduction
    ? join(process.resourcesPath, 'renderer', 'admin', 'index.html')
    : join(app.getAppPath(), 'resources', 'renderer', 'admin', 'index.html');

  adminWindow.loadFile(adminHtmlPath).then(() => {
    logger().info('[main] Admin panel HTML loaded');
  }).catch((error) => {
    logger().error(`[main] Failed to load admin panel HTML: ${String(error)}`);
  });

  // Set admin password from config if provided
  if (config.adminPassword) {
    setAdminPassword(config.adminPassword);
  }

  // Set main window reference for admin handlers
  if (mainWindow) {
    setMainWindowRef(mainWindow);
  }

  logger().info('[main] Admin panel setup complete');
}

/**
 * Setup admin panel triggers (keyboard shortcut + renderer IPC)
 */
function setupAdminTriggers(): void {
  logger().info('[main] Setting up admin triggers...');

  const windowManager = getWindowManager();

  // Keyboard shortcut trigger (backup, works even when renderer is crashed)
  const shortcut = process.platform === 'darwin' ? 'CommandOrControl+Shift+F12' : 'Ctrl+Shift+F12';
  const registered = globalShortcut.register(shortcut, () => {
    logger().info('[main] Admin panel triggered via keyboard shortcut');
    windowManager.toggleAdminWindow();
  });

  if (registered) {
    logger().info(`[main] Admin keyboard shortcut registered: ${shortcut}`);
  } else {
    logger().warn(`[main] Failed to register admin keyboard shortcut: ${shortcut}`);
  }

  // Renderer click zone trigger (primary)
  ipcMain.on(IPC_CHANNELS.ADMIN_TRIGGER, () => {
    logger().info('[main] Admin panel triggered via renderer click zone');
    windowManager.showAdminWindow();
  });

  logger().info('[main] Admin triggers setup complete');
}

/**
 * Cleanup before quit
 */
async function cleanup(): Promise<void> {
  logger().info('[main] Cleaning up...');

  // Unregister global shortcuts
  globalShortcut.unregisterAll();

  // Remove admin trigger listener
  ipcMain.removeAllListeners(IPC_CHANNELS.ADMIN_TRIGGER);

  // Unregister IPC handlers
  unregisterAllHandlers();

  // Unregister protocol
  const protocolHandler = getProtocolHandler();
  protocolHandler.unregister();

  logger().info('[main] Cleanup completed');
}

/**
 * Handle app ready
 */
async function onAppReady(): Promise<void> {
  logger().info('[main] App is ready');

  // Generate CSP based on whitelist configuration
  const cspPolicy = generateCSP(config.whitelist);
  logger().info('[main] CSP policy generated', {
    whitelist: config.whitelist,
    policy: cspPolicy.substring(0, 100) + '...',
  });

  // Set security headers for session
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspPolicy],
      },
    });
  });

  // Initialize application
  await initialize();

  // Create main window
  mainWindow = await createMainWindow();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    setMainWindowRef(null);
    logger().info('[main] Main window closed');
  });

  // Setup admin panel and triggers
  setupAdminPanel();
  setupAdminTriggers();
}

/**
 * Handle window all closed
 */
function onWindowAllClosed(): void {
  logger().info('[main] All windows closed');

  // On macOS, apps usually stay active until user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

/**
 * Handle app activate (macOS)
 */
async function onActivate(): Promise<void> {
  logger().info('[main] App activated');

  // On macOS, re-create window if dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = await createMainWindow();
  }
}

/**
 * Handle second instance (single instance lock)
 */
function onSecondInstance(): void {
  logger().info('[main] Second instance detected');

  // Focus existing window
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
}

/**
 * Application entry point
 */
async function main(): Promise<void> {
  // Initialize logger
  initLogger({
    level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    source: 'kiosk-shell',
  });

  logger().info('[main] Kiosk Shell starting...');
  logger().info(`[main] Version: ${app.getVersion()}`);
  logger().info(`[main] Electron: ${process.versions['electron']}`);
  logger().info(`[main] Node: ${process.versions['node']}`);
  logger().info(`[main] Chrome: ${process.versions['chrome']}`);

  // Ensure configuration file exists (copies bundled config on first run)
  ensureConfigFile();

  // Load configuration from file
  config = loadConfig();
  logger().info('[main] Configuration loaded', {
    kioskMode: config.kioskMode,
    devMode: config.devMode,
  });

  // Request single instance lock
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    logger().warn('[main] Another instance is already running, quitting...');
    app.quit();
    return;
  }

  // Handle second instance
  app.on('second-instance', onSecondInstance);

  // Register protocol scheme (must be done before app ready)
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'kiosk',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);

  // Wait for app ready
  await app.whenReady();
  await onAppReady();

  // Register event handlers
  app.on('window-all-closed', onWindowAllClosed);
  app.on('activate', () => {
    void onActivate();
  });

  // Handle before-quit
  app.on('before-quit', () => {
    logger().info('[main] Before quit event');
  });

  // Handle quit
  app.on('quit', () => {
    logger().info('[main] Application quit');
  });
}

// Start application
main().catch((error) => {
  console.error('Failed to start application:', error);
  app.quit();
});
