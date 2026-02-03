/**
 * Rollback mechanism for reverting to previous versions
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from '@kiosk/logger';
import type {
  RollbackConfig,
  RollbackState,
  VersionBackupInfo,
  UpdateResult,
} from './types';
import {
  DEFAULT_ROLLBACK_CONFIG,
  FILE_NAMES,
  ERROR_MESSAGES,
} from './constants';

const logger = getLogger();

/**
 * Rollback state
 */
let rollbackState: RollbackState = {
  backups: [],
  isRollingBack: false,
};

/**
 * Rollback configuration
 */
let config: RollbackConfig = {};

/**
 * Manifest file structure
 */
interface BackupManifest {
  backups: VersionBackupInfo[];
  lastUpdated: number;
}

/**
 * Read backup manifest
 */
function readManifest(backupDir: string): BackupManifest {
  const manifestPath = path.join(backupDir, FILE_NAMES.BACKUP_MANIFEST);
  try {
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as BackupManifest;
    }
  } catch (error) {
    logger.warn(`Failed to read backup manifest: ${(error as Error).message}`);
  }
  return { backups: [], lastUpdated: 0 };
}

/**
 * Write backup manifest
 */
function writeManifest(backupDir: string, manifest: BackupManifest): void {
  const manifestPath = path.join(backupDir, FILE_NAMES.BACKUP_MANIFEST);
  ensureDir(backupDir);
  manifest.lastUpdated = Date.now();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
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
 * Get directory size recursively
 */
function getDirSize(dir: string): number {
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(entryPath);
      } else {
        size += fs.statSync(entryPath).size;
      }
    }
  } catch {
    // Ignore errors
  }
  return size;
}

/**
 * Copy directory recursively
 */
function copyDir(src: string, dest: string): void {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove directory recursively
 */
function removeDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Initialize rollback manager
 */
export function initRollback(userConfig: RollbackConfig = {}): void {
  config = { ...userConfig };

  const backupDir = config.backupDir ?? DEFAULT_ROLLBACK_CONFIG.backupDir;
  if (backupDir && fs.existsSync(backupDir)) {
    const manifest = readManifest(backupDir);
    rollbackState.backups = manifest.backups;
  }

  logger.info('Rollback manager initialized', {
    backupCount: rollbackState.backups.length,
  });
}

/**
 * Create a backup of the current version
 */
export function createBackup(
  sourceDir: string,
  version: string
): UpdateResult {
  const backupDir = config.backupDir ?? DEFAULT_ROLLBACK_CONFIG.backupDir;
  if (!backupDir) {
    return { success: false, error: 'Backup directory not configured' };
  }

  try {
    logger.info(`Creating backup for version ${version}...`);

    // Check if backup already exists
    const existingBackup = rollbackState.backups.find((b) => b.version === version);
    if (existingBackup) {
      logger.info(`Backup for version ${version} already exists`);
      return { success: true, version };
    }

    // Create backup directory
    const versionBackupDir = path.join(backupDir, `v${version.replace(/\./g, '_')}`);
    ensureDir(versionBackupDir);

    // Copy source to backup
    copyDir(sourceDir, versionBackupDir);

    // Calculate size
    const size = getDirSize(versionBackupDir);

    // Create backup info
    const backupInfo: VersionBackupInfo = {
      version,
      path: versionBackupDir,
      timestamp: Date.now(),
      size,
    };

    // Add to state
    rollbackState.backups.push(backupInfo);

    // Cleanup old backups if needed
    const maxVersions = config.maxVersions ?? DEFAULT_ROLLBACK_CONFIG.maxVersions ?? 3;
    cleanupOldBackups(maxVersions);

    // Save manifest
    writeManifest(backupDir, { backups: rollbackState.backups, lastUpdated: Date.now() });

    logger.info(`Backup created for version ${version}`, { path: versionBackupDir, size });

    return { success: true, version };
  } catch (error) {
    logger.error(`Failed to create backup: ${(error as Error).message}`);
    return { success: false, error: ERROR_MESSAGES.BACKUP_FAILED };
  }
}

/**
 * Rollback to a specific version
 */
export function rollbackToVersion(
  targetVersion: string,
  destDir: string
): UpdateResult {
  const backupDir = config.backupDir ?? DEFAULT_ROLLBACK_CONFIG.backupDir;
  if (!backupDir) {
    return { success: false, error: 'Backup directory not configured' };
  }

  const backup = rollbackState.backups.find((b) => b.version === targetVersion);
  if (!backup) {
    return { success: false, error: ERROR_MESSAGES.VERSION_NOT_FOUND };
  }

  if (!fs.existsSync(backup.path)) {
    return { success: false, error: ERROR_MESSAGES.VERSION_NOT_FOUND };
  }

  if (rollbackState.isRollingBack) {
    return { success: false, error: 'Rollback already in progress' };
  }

  try {
    rollbackState.isRollingBack = true;

    // Get current version for callback
    const currentVersion = getCurrentVersionFromBackups();

    if (config.onBeforeRollback && currentVersion) {
      try {
        config.onBeforeRollback(currentVersion, targetVersion);
      } catch (error) {
        logger.warn(`Error in onBeforeRollback callback: ${(error as Error).message}`);
      }
    }

    logger.info(`Rolling back to version ${targetVersion}...`);

    // Clear destination and copy backup
    removeDir(destDir);
    copyDir(backup.path, destDir);

    rollbackState.lastRollbackTime = Date.now();
    rollbackState.isRollingBack = false;

    logger.info(`Rollback to version ${targetVersion} completed`);

    if (config.onRollbackSuccess) {
      try {
        config.onRollbackSuccess(targetVersion);
      } catch (error) {
        logger.warn(`Error in onRollbackSuccess callback: ${(error as Error).message}`);
      }
    }

    return { success: true, version: targetVersion };
  } catch (error) {
    rollbackState.isRollingBack = false;
    rollbackState.lastError = error as Error;
    logger.error(`Rollback failed: ${(error as Error).message}`);

    if (config.onRollbackError) {
      try {
        config.onRollbackError(error as Error);
      } catch (err) {
        logger.warn(`Error in onRollbackError callback: ${(err as Error).message}`);
      }
    }

    return { success: false, error: ERROR_MESSAGES.ROLLBACK_FAILED };
  }
}

/**
 * Rollback to the previous version
 */
export function rollbackToPrevious(destDir: string): UpdateResult {
  if (rollbackState.backups.length < 2) {
    return { success: false, error: ERROR_MESSAGES.NO_BACKUP_AVAILABLE };
  }

  // Sort by timestamp descending
  const sorted = [...rollbackState.backups].sort((a, b) => b.timestamp - a.timestamp);
  const previousVersion = sorted[1]?.version;

  if (!previousVersion) {
    return { success: false, error: ERROR_MESSAGES.NO_BACKUP_AVAILABLE };
  }

  return rollbackToVersion(previousVersion, destDir);
}

/**
 * Get current version from most recent backup
 */
function getCurrentVersionFromBackups(): string | undefined {
  if (rollbackState.backups.length === 0) {
    return undefined;
  }
  const sorted = [...rollbackState.backups].sort((a, b) => b.timestamp - a.timestamp);
  return sorted[0]?.version;
}

/**
 * Cleanup old backups to maintain max versions limit
 */
function cleanupOldBackups(maxVersions: number): void {
  if (rollbackState.backups.length <= maxVersions) {
    return;
  }

  // Sort by timestamp ascending (oldest first)
  const sorted = [...rollbackState.backups].sort((a, b) => a.timestamp - b.timestamp);

  // Remove oldest backups
  const toRemove = sorted.slice(0, rollbackState.backups.length - maxVersions);

  for (const backup of toRemove) {
    try {
      removeDir(backup.path);
      logger.info(`Removed old backup: ${backup.version}`);
    } catch (error) {
      logger.warn(`Failed to remove old backup ${backup.version}: ${(error as Error).message}`);
    }
  }

  // Update state
  rollbackState.backups = sorted.slice(rollbackState.backups.length - maxVersions);
}

/**
 * Get available backup versions
 */
export function getAvailableBackups(): VersionBackupInfo[] {
  return [...rollbackState.backups].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Check if a specific version backup exists
 */
export function hasBackup(version: string): boolean {
  return rollbackState.backups.some((b) => b.version === version);
}

/**
 * Get rollback state
 */
export function getRollbackState(): RollbackState {
  return { ...rollbackState };
}

/**
 * Check if rollback is in progress
 */
export function isRollingBack(): boolean {
  return rollbackState.isRollingBack;
}

/**
 * Remove a specific backup
 */
export function removeBackup(version: string): UpdateResult {
  const backupDir = config.backupDir ?? DEFAULT_ROLLBACK_CONFIG.backupDir;
  const backup = rollbackState.backups.find((b) => b.version === version);

  if (!backup) {
    return { success: false, error: ERROR_MESSAGES.VERSION_NOT_FOUND };
  }

  try {
    removeDir(backup.path);
    rollbackState.backups = rollbackState.backups.filter((b) => b.version !== version);

    if (backupDir) {
      writeManifest(backupDir, { backups: rollbackState.backups, lastUpdated: Date.now() });
    }

    logger.info(`Removed backup for version ${version}`);
    return { success: true, version };
  } catch (error) {
    logger.error(`Failed to remove backup ${version}: ${(error as Error).message}`);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Clear all backups
 */
export function clearAllBackups(): UpdateResult {
  const backupDir = config.backupDir ?? DEFAULT_ROLLBACK_CONFIG.backupDir;

  try {
    for (const backup of rollbackState.backups) {
      try {
        removeDir(backup.path);
      } catch {
        // Continue with other backups
      }
    }

    rollbackState.backups = [];

    if (backupDir) {
      writeManifest(backupDir, { backups: [], lastUpdated: Date.now() });
    }

    logger.info('Cleared all backups');
    return { success: true };
  } catch (error) {
    logger.error(`Failed to clear backups: ${(error as Error).message}`);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update configuration
 */
export function updateRollbackConfig(newConfig: Partial<RollbackConfig>): void {
  config = { ...config, ...newConfig };
  logger.info('Rollback config updated');
}

/**
 * Reset rollback state (for testing)
 */
export function resetRollbackState(): void {
  rollbackState = {
    backups: [],
    isRollingBack: false,
  };
  config = {};
}
