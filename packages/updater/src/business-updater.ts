/**
 * Business updater with A/B buffering mechanism
 * Handles hot updates for business resources
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getLogger } from '@kiosk/logger';
import type {
  BusinessUpdaterConfig,
  BusinessUpdaterState,
  BusinessVersionInfo,
  BufferSlot,
  BufferSlotInfo,
  UpdateResult,
} from './types';
import {
  DEFAULT_BUSINESS_UPDATER_CONFIG,
  BUFFER_DIR_NAMES,
  FILE_NAMES,
  ERROR_MESSAGES,
} from './constants';

const logger = getLogger();

/**
 * Business updater state
 */
let updaterState: BusinessUpdaterState;

/**
 * Updater configuration
 */
let config: BusinessUpdaterConfig = {};

/**
 * Initialize default state
 */
function createInitialState(baseDir: string): BusinessUpdaterState {
  return {
    status: 'idle',
    activeSlot: 'A',
    downloadProgress: 0,
    slotA: {
      slot: 'A',
      path: path.join(baseDir, BUFFER_DIR_NAMES.A),
      active: true,
    },
    slotB: {
      slot: 'B',
      path: path.join(baseDir, BUFFER_DIR_NAMES.B),
      active: false,
    },
  };
}

/**
 * Get the inactive slot
 */
function getInactiveSlot(): BufferSlot {
  return updaterState.activeSlot === 'A' ? 'B' : 'A';
}

/**
 * Get slot info by slot identifier
 */
function getSlotInfo(slot: BufferSlot): BufferSlotInfo {
  return slot === 'A' ? updaterState.slotA : updaterState.slotB;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read version info from a slot
 */
function readSlotVersion(slotPath: string): string | undefined {
  const versionFile = path.join(slotPath, FILE_NAMES.VERSION_INFO);
  try {
    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf-8')) as { version?: string };
      return data.version;
    }
  } catch (error) {
    logger.warn(`Failed to read version from ${slotPath}: ${(error as Error).message}`);
  }
  return undefined;
}

/**
 * Write version info to a slot
 */
function writeSlotVersion(slotPath: string, version: string): void {
  const versionFile = path.join(slotPath, FILE_NAMES.VERSION_INFO);
  ensureDir(slotPath);
  fs.writeFileSync(versionFile, JSON.stringify({ version, timestamp: Date.now() }));
}

/**
 * Read active slot marker
 */
function readActiveSlot(baseDir: string): BufferSlot {
  const markerFile = path.join(baseDir, FILE_NAMES.ACTIVE_SLOT);
  try {
    if (fs.existsSync(markerFile)) {
      const data = JSON.parse(fs.readFileSync(markerFile, 'utf-8')) as { slot?: string };
      if (data.slot === 'A' || data.slot === 'B') {
        return data.slot;
      }
    }
  } catch (error) {
    logger.warn(`Failed to read active slot marker: ${(error as Error).message}`);
  }
  return 'A'; // Default to slot A
}

/**
 * Write active slot marker
 */
function writeActiveSlot(baseDir: string, slot: BufferSlot): void {
  const markerFile = path.join(baseDir, FILE_NAMES.ACTIVE_SLOT);
  ensureDir(baseDir);
  fs.writeFileSync(markerFile, JSON.stringify({ slot, timestamp: Date.now() }));
}

/**
 * Calculate SHA256 hash of a file
 */
function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Download file with progress tracking
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (percent: number, transferred: number, total: number) => void
): Promise<void> {
  // Try to use electron-dl if available, otherwise fall back to fetch
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let transferred = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      transferred += value.length;

      if (onProgress && total > 0) {
        const percent = (transferred / total) * 100;
        onProgress(percent, transferred, total);
      }
    }

    const buffer = Buffer.concat(chunks);
    ensureDir(path.dirname(destPath));
    fs.writeFileSync(destPath, buffer);
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.DOWNLOAD_FAILED}: ${(error as Error).message}`);
  }
}

/**
 * Extract zip file
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(zipPath);
    ensureDir(destDir);
    zip.extractAllTo(destDir, true);
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.EXTRACT_FAILED}: ${(error as Error).message}`);
  }
}

/**
 * Clear slot contents (except version.json)
 */
function clearSlot(slotPath: string): void {
  if (!fs.existsSync(slotPath)) {
    return;
  }

  const entries = fs.readdirSync(slotPath);
  for (const entry of entries) {
    if (entry === FILE_NAMES.VERSION_INFO) {
      continue; // Keep version info for reference
    }
    const entryPath = path.join(slotPath, entry);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}

/**
 * Initialize business updater
 */
export function initBusinessUpdater(userConfig: BusinessUpdaterConfig = {}): void {
  config = { ...userConfig };

  const baseDir = config.bufferBaseDir ?? DEFAULT_BUSINESS_UPDATER_CONFIG.bufferBaseDir ?? '';
  if (!baseDir) {
    logger.warn('Business updater initialized without buffer base directory');
  }

  updaterState = createInitialState(baseDir);

  // Read current state from disk
  if (baseDir && fs.existsSync(baseDir)) {
    updaterState.activeSlot = readActiveSlot(baseDir);

    const slotAVersion = readSlotVersion(updaterState.slotA.path);
    const slotBVersion = readSlotVersion(updaterState.slotB.path);

    if (slotAVersion) {
      updaterState.slotA.version = slotAVersion;
    }
    if (slotBVersion) {
      updaterState.slotB.version = slotBVersion;
    }

    updaterState.slotA.active = updaterState.activeSlot === 'A';
    updaterState.slotB.active = updaterState.activeSlot === 'B';

    if (updaterState.activeSlot === 'A' && updaterState.slotA.version) {
      updaterState.currentVersion = updaterState.slotA.version;
    } else if (updaterState.activeSlot === 'B' && updaterState.slotB.version) {
      updaterState.currentVersion = updaterState.slotB.version;
    }
  }

  logger.info('Business updater initialized', {
    activeSlot: updaterState.activeSlot,
    currentVersion: updaterState.currentVersion,
  });
}

/**
 * Check for business updates
 */
export async function checkForBusinessUpdate(): Promise<UpdateResult> {
  const versionUrl = config.versionCheckUrl ?? DEFAULT_BUSINESS_UPDATER_CONFIG.versionCheckUrl;
  if (!versionUrl) {
    return { success: false, error: ERROR_MESSAGES.NO_VERSION_CHECK_URL };
  }

  if (updaterState.status === 'checking' || updaterState.status === 'downloading') {
    return { success: false, error: ERROR_MESSAGES.ALREADY_UPDATING };
  }

  try {
    updaterState.status = 'checking';
    logger.info('Checking for business updates...');

    const timeout = config.timeoutMs ?? DEFAULT_BUSINESS_UPDATER_CONFIG.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(versionUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const versionInfo = (await response.json()) as BusinessVersionInfo;

    if (!versionInfo.version || !versionInfo.downloadUrl || !versionInfo.hash) {
      throw new Error(ERROR_MESSAGES.INVALID_VERSION_INFO);
    }

    // Check if update is needed
    if (updaterState.currentVersion === versionInfo.version) {
      updaterState.status = 'not-available';
      logger.info('Business version is up to date');
      return { success: true };
    }

    updaterState.status = 'available';
    updaterState.pendingUpdate = versionInfo;
    logger.info(`Business update available: ${versionInfo.version}`);

    if (config.onUpdateAvailable) {
      try {
        config.onUpdateAvailable(versionInfo);
      } catch (error) {
        logger.warn(`Error in onUpdateAvailable callback: ${(error as Error).message}`);
      }
    }

    return { success: true, version: versionInfo.version };
  } catch (error) {
    updaterState.status = 'error';
    updaterState.lastError = error as Error;
    logger.error(`Business update check failed: ${(error as Error).message}`);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Download and apply business update
 */
export async function downloadBusinessUpdate(): Promise<UpdateResult> {
  if (updaterState.status !== 'available' || !updaterState.pendingUpdate) {
    return { success: false, error: 'No update available to download' };
  }

  const baseDir = config.bufferBaseDir ?? DEFAULT_BUSINESS_UPDATER_CONFIG.bufferBaseDir;
  if (!baseDir) {
    return { success: false, error: ERROR_MESSAGES.NO_BUFFER_DIR };
  }

  const updateInfo = updaterState.pendingUpdate;
  const inactiveSlot = getInactiveSlot();
  const slotInfo = getSlotInfo(inactiveSlot);

  try {
    updaterState.status = 'downloading';
    updaterState.downloadProgress = 0;
    logger.info(`Downloading business update to slot ${inactiveSlot}...`);

    // Download update package
    const packagePath = path.join(baseDir, FILE_NAMES.UPDATE_PACKAGE);

    await downloadFile(updateInfo.downloadUrl, packagePath, (percent, transferred, total) => {
      updaterState.downloadProgress = percent;

      if (config.onDownloadProgress) {
        try {
          config.onDownloadProgress(percent, transferred, total);
        } catch (error) {
          logger.warn(`Error in onDownloadProgress callback: ${(error as Error).message}`);
        }
      }
    });

    // Verify hash if enabled
    const verifyHash = config.verifyHash ?? DEFAULT_BUSINESS_UPDATER_CONFIG.verifyHash;
    if (verifyHash) {
      logger.info('Verifying update hash...');
      const actualHash = await calculateFileHash(packagePath);
      if (actualHash.toLowerCase() !== updateInfo.hash.toLowerCase()) {
        throw new Error(ERROR_MESSAGES.HASH_MISMATCH);
      }
      logger.info('Hash verification passed');
    }

    // Clear inactive slot and extract
    logger.info(`Extracting update to slot ${inactiveSlot}...`);
    clearSlot(slotInfo.path);
    await extractZip(packagePath, slotInfo.path);

    // Write version info to new slot
    writeSlotVersion(slotInfo.path, updateInfo.version);

    // Update slot info
    if (inactiveSlot === 'A') {
      updaterState.slotA.version = updateInfo.version;
      updaterState.slotA.lastUpdated = Date.now();
    } else {
      updaterState.slotB.version = updateInfo.version;
      updaterState.slotB.lastUpdated = Date.now();
    }

    // Cleanup
    fs.unlinkSync(packagePath);

    updaterState.status = 'downloaded';
    updaterState.downloadProgress = 100;
    logger.info(`Business update downloaded to slot ${inactiveSlot}: ${updateInfo.version}`);

    if (config.onUpdateReady) {
      try {
        config.onUpdateReady(inactiveSlot, updateInfo.version);
      } catch (error) {
        logger.warn(`Error in onUpdateReady callback: ${(error as Error).message}`);
      }
    }

    return { success: true, version: updateInfo.version };
  } catch (error) {
    updaterState.status = 'error';
    updaterState.lastError = error as Error;
    logger.error(`Business update download failed: ${(error as Error).message}`);

    if (config.onError) {
      try {
        config.onError(error as Error);
      } catch (err) {
        logger.warn(`Error in onError callback: ${(err as Error).message}`);
      }
    }

    return { success: false, error: (error as Error).message };
  }
}

/**
 * Switch to the updated slot (apply the update)
 */
export function applyBusinessUpdate(): UpdateResult {
  if (updaterState.status !== 'downloaded') {
    return { success: false, error: 'No downloaded update to apply' };
  }

  const baseDir = config.bufferBaseDir ?? DEFAULT_BUSINESS_UPDATER_CONFIG.bufferBaseDir ?? '';
  if (!baseDir) {
    return { success: false, error: ERROR_MESSAGES.NO_BUFFER_DIR };
  }

  const newSlot = getInactiveSlot();
  const slotInfo = getSlotInfo(newSlot);
  const newVersion = slotInfo.version;

  if (!newVersion) {
    return { success: false, error: 'Slot version not found' };
  }

  try {
    logger.info(`Switching to slot ${newSlot}...`);

    // Update active slot marker
    writeActiveSlot(baseDir, newSlot);

    // Update state
    updaterState.activeSlot = newSlot;
    updaterState.currentVersion = newVersion;
    updaterState.slotA.active = newSlot === 'A';
    updaterState.slotB.active = newSlot === 'B';
    delete updaterState.pendingUpdate;
    updaterState.status = 'idle';

    logger.info(`Switched to slot ${newSlot}, version: ${newVersion}`);

    return { success: true, version: newVersion };
  } catch (error) {
    updaterState.status = 'error';
    updaterState.lastError = error as Error;
    logger.error(`Failed to switch slots: ${(error as Error).message}`);
    return { success: false, error: ERROR_MESSAGES.SWITCH_FAILED };
  }
}

/**
 * Get the path to the active slot's resources
 */
export function getActiveSlotPath(): string {
  const slotInfo = getSlotInfo(updaterState.activeSlot);
  return slotInfo.path;
}

/**
 * Get current business updater state
 */
export function getBusinessUpdaterState(): BusinessUpdaterState {
  return { ...updaterState };
}

/**
 * Get current business version
 */
export function getCurrentBusinessVersion(): string | undefined {
  return updaterState.currentVersion;
}

/**
 * Check if business update is available
 */
export function isBusinessUpdateAvailable(): boolean {
  return updaterState.status === 'available' || updaterState.status === 'downloaded';
}

/**
 * Check if business update is ready to apply
 */
export function isBusinessUpdateReady(): boolean {
  return updaterState.status === 'downloaded';
}

/**
 * Update configuration
 */
export function updateBusinessUpdaterConfig(newConfig: Partial<BusinessUpdaterConfig>): void {
  config = { ...config, ...newConfig };
  logger.info('Business updater config updated');
}

/**
 * Reset business updater state (for testing)
 */
export function resetBusinessUpdaterState(): void {
  const baseDir = config.bufferBaseDir ?? '';
  updaterState = createInitialState(baseDir);
  config = {};
}
