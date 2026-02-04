/**
 * UUID Manager
 * Manages device unique identifier with persistent storage
 */

import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { getLogger } from '@kiosk/logger';
import type {
  UuidManagerConfig,
  UuidManagerState,
  UuidData,
} from './types';
import {
  DEFAULT_UUID_MANAGER_CONFIG,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  UUID_PATTERN,
  STORAGE_PATHS,
} from './constants';

/**
 * Module state
 */
const state: UuidManagerState = {
  initialized: false,
  cachedUuid: null,
  storagePath: null,
};

/**
 * Current configuration
 */
let currentConfig: UuidManagerConfig = { ...DEFAULT_UUID_MANAGER_CONFIG };

/**
 * Get logger instance
 */
function getDeviceLogger() {
  return getLogger();
}

/**
 * Log info message with device prefix
 */
function logInfo(msg: string): void {
  getDeviceLogger().info(`[device] ${msg}`);
}

/**
 * Log error message with device prefix
 */
function logError(msg: string): void {
  getDeviceLogger().error(`[device] ${msg}`);
}

/**
 * Get the storage directory path based on configuration
 */
async function getStorageDir(): Promise<string> {
  switch (currentConfig.storageLocation) {
    case 'custom': {
      if (!currentConfig.customPath) {
        throw new Error(ERROR_MESSAGES.CUSTOM_PATH_REQUIRED);
      }
      return currentConfig.customPath;
    }
    case 'appData':
    case 'userData':
    default: {
      try {
        // Try to use Electron's app.getPath
        const electron = await import('electron');
        const app = electron.app || (electron as unknown as { remote?: { app: typeof electron.app } }).remote?.app;
        if (app) {
          return app.getPath(currentConfig.storageLocation);
        }
      } catch {
        // Not in Electron environment, use fallback
      }

      // Fallback to OS-specific paths
      const platform = process.platform as keyof typeof STORAGE_PATHS;
      const basePath = STORAGE_PATHS[platform] || STORAGE_PATHS.linux;

      // Use home directory as base
      const homeDir = process.env['HOME'] || process.env['USERPROFILE'] || '/tmp';
      if (platform === 'win32') {
        return join(process.env['APPDATA'] || homeDir, basePath);
      } else if (platform === 'darwin') {
        return join(homeDir, 'Library', 'Application Support', basePath);
      } else {
        return join(homeDir, '.config', basePath);
      }
    }
  }
}

/**
 * Get the full path to the UUID storage file
 */
async function getStoragePath(): Promise<string> {
  const dir = await getStorageDir();
  return join(dir, currentConfig.fileName);
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  return UUID_PATTERN.test(uuid);
}

/**
 * Generate a new UUID
 */
export function generateUuid(): string {
  return randomUUID();
}

/**
 * Read UUID data from storage
 */
function readUuidData(filePath: string): UuidData | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as unknown;

    // Validate the data structure
    if (
      typeof data === 'object' &&
      data !== null &&
      'uuid' in data &&
      typeof (data as { uuid: unknown }).uuid === 'string' &&
      isValidUuid((data as { uuid: string }).uuid)
    ) {
      return data as UuidData;
    }

    logError(ERROR_MESSAGES.UUID_FILE_CORRUPTED);
    return null;
  } catch {
    logError(ERROR_MESSAGES.UUID_STORAGE_READ_FAILED);
    return null;
  }
}

/**
 * Write UUID data to storage
 */
function writeUuidData(filePath: string, data: UuidData): void {
  try {
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    logInfo(LOG_MESSAGES.UUID_SAVED);
  } catch {
    logError(ERROR_MESSAGES.UUID_STORAGE_WRITE_FAILED);
    throw new Error(ERROR_MESSAGES.UUID_STORAGE_WRITE_FAILED);
  }
}

/**
 * Initialize the UUID manager
 * @param config - Optional configuration override
 */
export async function initUuidManager(config?: Partial<UuidManagerConfig>): Promise<void> {
  // Merge configuration
  currentConfig = { ...DEFAULT_UUID_MANAGER_CONFIG, ...config };

  // Get storage path
  state.storagePath = await getStoragePath();

  // Try to load existing UUID
  const existingData = readUuidData(state.storagePath);

  if (existingData && isValidUuid(existingData.uuid)) {
    state.cachedUuid = existingData.uuid;
    logInfo(LOG_MESSAGES.UUID_LOADED);
  } else {
    // Generate new UUID
    const newUuid = generateUuid();
    const uuidData: UuidData = {
      uuid: newUuid,
      createdAt: new Date().toISOString(),
      generationMethod: currentConfig.generationMethod,
    };

    // Try to get app version
    try {
      const electron = await import('electron');
      const app = electron.app || (electron as unknown as { remote?: { app: typeof electron.app } }).remote?.app;
      if (app) {
        uuidData.appVersion = app.getVersion();
      }
    } catch {
      // Not in Electron environment
    }

    // Save to storage
    writeUuidData(state.storagePath, uuidData);
    state.cachedUuid = newUuid;
    logInfo(LOG_MESSAGES.UUID_GENERATED);
  }

  state.initialized = true;
  logInfo(LOG_MESSAGES.UUID_INITIALIZED);
}

/**
 * Get the device UUID
 * @throws Error if UUID manager is not initialized
 */
export function getDeviceUuid(): string {
  if (!state.initialized || state.cachedUuid === null) {
    throw new Error(ERROR_MESSAGES.UUID_NOT_INITIALIZED);
  }
  return state.cachedUuid;
}

/**
 * Get the device UUID asynchronously (auto-initializes if needed)
 */
export async function getDeviceUuidAsync(): Promise<string> {
  if (!state.initialized) {
    await initUuidManager();
  }
  return getDeviceUuid();
}

/**
 * Check if UUID manager is initialized
 */
export function isUuidManagerInitialized(): boolean {
  return state.initialized;
}

/**
 * Get the current UUID manager state (for debugging)
 */
export function getUuidManagerState(): Readonly<UuidManagerState> {
  return { ...state };
}

/**
 * Reset the UUID manager (mainly for testing)
 * This does NOT delete the stored UUID file
 */
export function resetUuidManager(): void {
  state.initialized = false;
  state.cachedUuid = null;
  state.storagePath = null;
  currentConfig = { ...DEFAULT_UUID_MANAGER_CONFIG };
}

/**
 * Regenerate the device UUID
 * WARNING: This should only be used in exceptional circumstances
 * @returns The new UUID
 */
export async function regenerateDeviceUuid(): Promise<string> {
  if (!state.initialized) {
    throw new Error(ERROR_MESSAGES.UUID_NOT_INITIALIZED);
  }

  const newUuid = generateUuid();
  const uuidData: UuidData = {
    uuid: newUuid,
    createdAt: new Date().toISOString(),
    generationMethod: currentConfig.generationMethod,
  };

  // Try to get app version
  try {
    const electron = await import('electron');
    const app = electron.app || (electron as unknown as { remote?: { app: typeof electron.app } }).remote?.app;
    if (app) {
      uuidData.appVersion = app.getVersion();
    }
  } catch {
    // Not in Electron environment
  }

  if (state.storagePath) {
    writeUuidData(state.storagePath, uuidData);
  }

  state.cachedUuid = newUuid;
  logInfo(LOG_MESSAGES.UUID_GENERATED);

  return newUuid;
}
