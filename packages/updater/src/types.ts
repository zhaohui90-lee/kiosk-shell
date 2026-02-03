/**
 * @kiosk/updater type definitions
 */

/**
 * Update channel
 */
export type UpdateChannel = 'stable' | 'beta' | 'alpha';

/**
 * Update status
 */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

/**
 * Shell update info
 */
export interface ShellUpdateInfo {
  /** Version string */
  version: string;
  /** Release notes */
  releaseNotes?: string;
  /** Release date */
  releaseDate?: string;
  /** Download URL */
  downloadUrl?: string;
  /** File size in bytes */
  size?: number;
}

/**
 * Shell updater configuration
 */
export interface ShellUpdaterConfig {
  /** Update server URL */
  updateServerUrl?: string | undefined;
  /** Update channel */
  channel?: UpdateChannel | undefined;
  /** Auto download updates */
  autoDownload?: boolean | undefined;
  /** Auto install on quit */
  autoInstallOnQuit?: boolean | undefined;
  /** Check interval in milliseconds */
  checkIntervalMs?: number | undefined;
  /** Callback when update available */
  onUpdateAvailable?: ((info: ShellUpdateInfo) => void) | undefined;
  /** Callback when update not available */
  onUpdateNotAvailable?: (() => void) | undefined;
  /** Callback when download progress changes */
  onDownloadProgress?: ((percent: number, transferred: number, total: number) => void) | undefined;
  /** Callback when update downloaded */
  onUpdateDownloaded?: ((info: ShellUpdateInfo) => void) | undefined;
  /** Callback when error occurs */
  onError?: ((error: Error) => void) | undefined;
}

/**
 * Shell updater state
 */
export interface ShellUpdaterState {
  /** Current status */
  status: UpdateStatus;
  /** Current version */
  currentVersion: string;
  /** Available update info */
  availableUpdate?: ShellUpdateInfo;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Last check timestamp */
  lastCheckTime?: number;
  /** Last error */
  lastError?: Error;
}

/**
 * Business resource version info
 */
export interface BusinessVersionInfo {
  /** Version string */
  version: string;
  /** Download URL */
  downloadUrl: string;
  /** File hash (SHA256) */
  hash: string;
  /** File size in bytes */
  size: number;
  /** Release notes */
  releaseNotes?: string;
  /** Minimum shell version required */
  minShellVersion?: string;
}

/**
 * A/B buffer slot
 */
export type BufferSlot = 'A' | 'B';

/**
 * Buffer slot info
 */
export interface BufferSlotInfo {
  /** Slot identifier */
  slot: BufferSlot;
  /** Version in this slot */
  version?: string;
  /** Path to the slot directory */
  path: string;
  /** Whether this slot is currently active */
  active: boolean;
  /** Last update timestamp */
  lastUpdated?: number;
}

/**
 * Business updater configuration
 */
export interface BusinessUpdaterConfig {
  /** Base directory for A/B buffers */
  bufferBaseDir?: string | undefined;
  /** Version check URL */
  versionCheckUrl?: string | undefined;
  /** Request timeout in milliseconds */
  timeoutMs?: number | undefined;
  /** Enable hash verification */
  verifyHash?: boolean | undefined;
  /** Callback when update available */
  onUpdateAvailable?: ((info: BusinessVersionInfo) => void) | undefined;
  /** Callback when download progress changes */
  onDownloadProgress?: ((percent: number, transferred: number, total: number) => void) | undefined;
  /** Callback when update ready to apply */
  onUpdateReady?: ((slot: BufferSlot, version: string) => void) | undefined;
  /** Callback when error occurs */
  onError?: ((error: Error) => void) | undefined;
}

/**
 * Business updater state
 */
export interface BusinessUpdaterState {
  /** Current status */
  status: UpdateStatus;
  /** Active buffer slot */
  activeSlot: BufferSlot;
  /** Current active version */
  currentVersion?: string;
  /** Slot A info */
  slotA: BufferSlotInfo;
  /** Slot B info */
  slotB: BufferSlotInfo;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Pending update info */
  pendingUpdate?: BusinessVersionInfo;
  /** Last error */
  lastError?: Error;
}

/**
 * Rollback configuration
 */
export interface RollbackConfig {
  /** Maximum number of versions to keep for rollback */
  maxVersions?: number | undefined;
  /** Backup directory path */
  backupDir?: string | undefined;
  /** Callback before rollback */
  onBeforeRollback?: ((fromVersion: string, toVersion: string) => void) | undefined;
  /** Callback after successful rollback */
  onRollbackSuccess?: ((version: string) => void) | undefined;
  /** Callback when rollback fails */
  onRollbackError?: ((error: Error) => void) | undefined;
}

/**
 * Version backup info
 */
export interface VersionBackupInfo {
  /** Version string */
  version: string;
  /** Backup path */
  path: string;
  /** Backup timestamp */
  timestamp: number;
  /** Backup size in bytes */
  size?: number;
}

/**
 * Rollback state
 */
export interface RollbackState {
  /** Available version backups */
  backups: VersionBackupInfo[];
  /** Currently rolling back */
  isRollingBack: boolean;
  /** Last rollback timestamp */
  lastRollbackTime?: number;
  /** Last rollback error */
  lastError?: Error;
}

/**
 * Update result
 */
export interface UpdateResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** New version if updated */
  version?: string;
}

/**
 * Download progress info
 */
export interface DownloadProgress {
  /** Progress percentage (0-100) */
  percent: number;
  /** Bytes transferred */
  transferred: number;
  /** Total bytes */
  total: number;
  /** Download speed in bytes per second */
  bytesPerSecond?: number;
}
