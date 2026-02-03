/**
 * Shell updater for Electron application updates
 * Uses electron-updater for auto-update functionality
 */

import { getLogger } from '@kiosk/logger';
import type {
  ShellUpdaterConfig,
  ShellUpdaterState,
  ShellUpdateInfo,
  UpdateStatus,
  UpdateResult,
} from './types';
import {
  DEFAULT_SHELL_UPDATER_CONFIG,
  ERROR_MESSAGES,
} from './constants';

const logger = getLogger();

/**
 * Shell updater state
 */
let updaterState: ShellUpdaterState = {
  status: 'idle',
  currentVersion: '0.0.0',
  downloadProgress: 0,
};

/**
 * Updater configuration
 */
let config: ShellUpdaterConfig = {};

/**
 * Check interval timer
 */
let checkIntervalTimer: ReturnType<typeof setInterval> | undefined;

/**
 * electron-updater instance (lazy loaded)
 */
let autoUpdater: typeof import('electron-updater').autoUpdater | undefined;

/**
 * Initialize electron-updater (lazy load to avoid issues in non-Electron environments)
 */
async function getAutoUpdater(): Promise<typeof import('electron-updater').autoUpdater | undefined> {
  if (autoUpdater) {
    return autoUpdater;
  }

  try {
    const electronUpdater = await import('electron-updater');
    autoUpdater = electronUpdater.autoUpdater;
    return autoUpdater;
  } catch (error) {
    logger.warn('electron-updater not available, shell updates disabled');
    return undefined;
  }
}

/**
 * Set updater status
 */
function setStatus(status: UpdateStatus): void {
  updaterState.status = status;
  logger.debug(`Shell updater status changed to: ${status}`);
}

/**
 * Initialize shell updater
 */
export async function initShellUpdater(
  userConfig: ShellUpdaterConfig = {}
): Promise<boolean> {
  config = { ...userConfig };

  const updater = await getAutoUpdater();
  if (!updater) {
    logger.warn('Shell updater initialization failed: electron-updater not available');
    return false;
  }

  // Get current version
  try {
    const { app } = await import('electron');
    updaterState.currentVersion = app.getVersion();
  } catch {
    logger.warn('Could not get app version');
  }

  // Configure updater
  const serverUrl = config.updateServerUrl ?? DEFAULT_SHELL_UPDATER_CONFIG.updateServerUrl;
  if (serverUrl) {
    updater.setFeedURL({
      provider: 'generic',
      url: serverUrl,
    });
  }

  const channel = config.channel ?? DEFAULT_SHELL_UPDATER_CONFIG.channel ?? 'stable';
  updater.channel = channel;

  const autoDownload = config.autoDownload ?? DEFAULT_SHELL_UPDATER_CONFIG.autoDownload ?? true;
  updater.autoDownload = autoDownload;

  const autoInstall = config.autoInstallOnQuit ?? DEFAULT_SHELL_UPDATER_CONFIG.autoInstallOnQuit ?? true;
  updater.autoInstallOnAppQuit = autoInstall;

  // Setup event handlers
  updater.on('checking-for-update', () => {
    setStatus('checking');
    logger.info('Checking for shell updates...');
  });

  updater.on('update-available', (info) => {
    setStatus('available');
    const releaseNotes = typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined;
    const updateInfo: ShellUpdateInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
    };
    if (releaseNotes) {
      updateInfo.releaseNotes = releaseNotes;
    }
    updaterState.availableUpdate = updateInfo;
    logger.info(`Shell update available: ${info.version}`);

    if (config.onUpdateAvailable) {
      try {
        config.onUpdateAvailable(updateInfo);
      } catch (error) {
        logger.warn(`Error in onUpdateAvailable callback: ${(error as Error).message}`);
      }
    }
  });

  updater.on('update-not-available', () => {
    setStatus('not-available');
    updaterState.lastCheckTime = Date.now();
    logger.info('No shell updates available');

    if (config.onUpdateNotAvailable) {
      try {
        config.onUpdateNotAvailable();
      } catch (error) {
        logger.warn(`Error in onUpdateNotAvailable callback: ${(error as Error).message}`);
      }
    }
  });

  updater.on('download-progress', (progress) => {
    setStatus('downloading');
    updaterState.downloadProgress = progress.percent;

    if (config.onDownloadProgress) {
      try {
        config.onDownloadProgress(progress.percent, progress.transferred, progress.total);
      } catch (error) {
        logger.warn(`Error in onDownloadProgress callback: ${(error as Error).message}`);
      }
    }
  });

  updater.on('update-downloaded', (info) => {
    setStatus('downloaded');
    updaterState.downloadProgress = 100;
    const releaseNotes2 = typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined;
    const updateInfo: ShellUpdateInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
    };
    if (releaseNotes2) {
      updateInfo.releaseNotes = releaseNotes2;
    }
    logger.info(`Shell update downloaded: ${info.version}`);

    if (config.onUpdateDownloaded) {
      try {
        config.onUpdateDownloaded(updateInfo);
      } catch (error) {
        logger.warn(`Error in onUpdateDownloaded callback: ${(error as Error).message}`);
      }
    }
  });

  updater.on('error', (error) => {
    setStatus('error');
    updaterState.lastError = error;
    logger.error(`Shell updater error: ${error.message}`);

    if (config.onError) {
      try {
        config.onError(error);
      } catch (err) {
        logger.warn(`Error in onError callback: ${(err as Error).message}`);
      }
    }
  });

  logger.info('Shell updater initialized', {
    version: updaterState.currentVersion,
    channel,
    autoDownload,
  });

  return true;
}

/**
 * Check for updates
 */
export async function checkForShellUpdate(): Promise<UpdateResult> {
  const updater = await getAutoUpdater();
  if (!updater) {
    return { success: false, error: 'Updater not available' };
  }

  if (updaterState.status === 'checking' || updaterState.status === 'downloading') {
    return { success: false, error: ERROR_MESSAGES.ALREADY_UPDATING };
  }

  try {
    setStatus('checking');
    const result = await updater.checkForUpdates();

    if (result?.updateInfo) {
      return {
        success: true,
        version: result.updateInfo.version,
      };
    }

    return { success: true };
  } catch (error) {
    setStatus('error');
    updaterState.lastError = error as Error;
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Download update
 */
export async function downloadShellUpdate(): Promise<UpdateResult> {
  const updater = await getAutoUpdater();
  if (!updater) {
    return { success: false, error: 'Updater not available' };
  }

  if (updaterState.status !== 'available') {
    return { success: false, error: 'No update available to download' };
  }

  try {
    setStatus('downloading');
    await updater.downloadUpdate();
    const result: UpdateResult = { success: true };
    const version = updaterState.availableUpdate?.version;
    if (version) {
      result.version = version;
    }
    return result;
  } catch (error) {
    setStatus('error');
    updaterState.lastError = error as Error;
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Install update and quit
 */
export async function installShellUpdate(): Promise<UpdateResult> {
  const updater = await getAutoUpdater();
  if (!updater) {
    return { success: false, error: 'Updater not available' };
  }

  if (updaterState.status !== 'downloaded') {
    return { success: false, error: 'No update downloaded to install' };
  }

  try {
    setStatus('installing');
    logger.info('Installing shell update and restarting...');
    updater.quitAndInstall(false, true);
    const result: UpdateResult = { success: true };
    const version = updaterState.availableUpdate?.version;
    if (version) {
      result.version = version;
    }
    return result;
  } catch (error) {
    setStatus('error');
    updaterState.lastError = error as Error;
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Start automatic update checks
 */
export function startAutoUpdateCheck(): void {
  const interval = config.checkIntervalMs ?? DEFAULT_SHELL_UPDATER_CONFIG.checkIntervalMs;

  if (checkIntervalTimer) {
    clearInterval(checkIntervalTimer);
  }

  checkIntervalTimer = setInterval(() => {
    checkForShellUpdate().catch((error) => {
      logger.error(`Auto update check failed: ${(error as Error).message}`);
    });
  }, interval);

  logger.info(`Started auto update check with interval: ${interval}ms`);
}

/**
 * Stop automatic update checks
 */
export function stopAutoUpdateCheck(): void {
  if (checkIntervalTimer) {
    clearInterval(checkIntervalTimer);
    checkIntervalTimer = undefined;
    logger.info('Stopped auto update check');
  }
}

/**
 * Get current updater state
 */
export function getShellUpdaterState(): ShellUpdaterState {
  return { ...updaterState };
}

/**
 * Get current version
 */
export function getCurrentVersion(): string {
  return updaterState.currentVersion;
}

/**
 * Check if update is available
 */
export function isUpdateAvailable(): boolean {
  return updaterState.status === 'available' || updaterState.status === 'downloaded';
}

/**
 * Check if update is downloaded and ready to install
 */
export function isUpdateReady(): boolean {
  return updaterState.status === 'downloaded';
}

/**
 * Update configuration
 */
export function updateShellUpdaterConfig(newConfig: Partial<ShellUpdaterConfig>): void {
  config = { ...config, ...newConfig };
  logger.info('Shell updater config updated');
}

/**
 * Reset updater state (for testing)
 */
export function resetShellUpdaterState(): void {
  if (checkIntervalTimer) {
    clearInterval(checkIntervalTimer);
    checkIntervalTimer = undefined;
  }

  updaterState = {
    status: 'idle',
    currentVersion: updaterState.currentVersion,
    downloadProgress: 0,
  };

  config = {};
  autoUpdater = undefined;
}
