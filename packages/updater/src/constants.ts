/**
 * @kiosk/updater constants
 */

import type {
  ShellUpdaterConfig,
  BusinessUpdaterConfig,
  RollbackConfig,
} from './types';

/**
 * Default shell updater configuration
 */
export const DEFAULT_SHELL_UPDATER_CONFIG: Required<
  Omit<ShellUpdaterConfig, 'onUpdateAvailable' | 'onUpdateNotAvailable' | 'onDownloadProgress' | 'onUpdateDownloaded' | 'onError'>
> = {
  updateServerUrl: '',
  channel: 'stable',
  autoDownload: true,
  autoInstallOnQuit: true,
  checkIntervalMs: 3600000, // 1 hour
};

/**
 * Default business updater configuration
 */
export const DEFAULT_BUSINESS_UPDATER_CONFIG: Required<
  Omit<BusinessUpdaterConfig, 'onUpdateAvailable' | 'onDownloadProgress' | 'onUpdateReady' | 'onError'>
> = {
  bufferBaseDir: '',
  versionCheckUrl: '',
  timeoutMs: 30000, // 30 seconds
  verifyHash: true,
};

/**
 * Default rollback configuration
 */
export const DEFAULT_ROLLBACK_CONFIG: Required<
  Omit<RollbackConfig, 'onBeforeRollback' | 'onRollbackSuccess' | 'onRollbackError'>
> = {
  maxVersions: 3,
  backupDir: '',
};

/**
 * Buffer slot names
 */
export const BUFFER_SLOTS = {
  A: 'A',
  B: 'B',
} as const;

/**
 * Buffer directory names
 */
export const BUFFER_DIR_NAMES = {
  A: 'slot-a',
  B: 'slot-b',
} as const;

/**
 * Update status values
 */
export const UPDATE_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  NOT_AVAILABLE: 'not-available',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  INSTALLING: 'installing',
  ERROR: 'error',
} as const;

/**
 * File names
 */
export const FILE_NAMES = {
  /** Version info file in each slot */
  VERSION_INFO: 'version.json',
  /** Active slot marker file */
  ACTIVE_SLOT: 'active-slot.json',
  /** Backup manifest file */
  BACKUP_MANIFEST: 'manifest.json',
  /** Update package file */
  UPDATE_PACKAGE: 'update.zip',
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_UPDATE_SERVER: 'Update server URL is not configured',
  NO_VERSION_CHECK_URL: 'Version check URL is not configured',
  NO_BUFFER_DIR: 'Buffer base directory is not configured',
  DOWNLOAD_FAILED: 'Failed to download update',
  HASH_MISMATCH: 'Hash verification failed',
  EXTRACT_FAILED: 'Failed to extract update package',
  SWITCH_FAILED: 'Failed to switch to new version',
  ROLLBACK_FAILED: 'Failed to rollback to previous version',
  NO_BACKUP_AVAILABLE: 'No backup available for rollback',
  VERSION_NOT_FOUND: 'Version not found in backups',
  BACKUP_FAILED: 'Failed to create backup',
  ALREADY_UPDATING: 'Update is already in progress',
  INVALID_VERSION_INFO: 'Invalid version info received',
  MIN_VERSION_NOT_MET: 'Minimum shell version requirement not met',
} as const;

/**
 * Default timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  /** Download timeout */
  DOWNLOAD: 300000, // 5 minutes
  /** Version check timeout */
  VERSION_CHECK: 10000, // 10 seconds
  /** Extract timeout */
  EXTRACT: 60000, // 1 minute
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  /** Maximum retry attempts */
  MAX_ATTEMPTS: 3,
  /** Base delay between retries (ms) */
  BASE_DELAY: 1000,
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
} as const;
