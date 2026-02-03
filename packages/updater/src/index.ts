/**
 * @kiosk/updater
 * Update module for shell and business hot updates with A/B buffering
 */

// Types
export type {
  UpdateChannel,
  UpdateStatus,
  ShellUpdateInfo,
  ShellUpdaterConfig,
  ShellUpdaterState,
  BusinessVersionInfo,
  BufferSlot,
  BufferSlotInfo,
  BusinessUpdaterConfig,
  BusinessUpdaterState,
  RollbackConfig,
  VersionBackupInfo,
  RollbackState,
  UpdateResult,
  DownloadProgress,
} from './types';

// Constants
export {
  DEFAULT_SHELL_UPDATER_CONFIG,
  DEFAULT_BUSINESS_UPDATER_CONFIG,
  DEFAULT_ROLLBACK_CONFIG,
  BUFFER_SLOTS,
  BUFFER_DIR_NAMES,
  UPDATE_STATUS,
  FILE_NAMES,
  ERROR_MESSAGES,
  TIMEOUTS,
  RETRY_CONFIG,
} from './constants';

// Shell updater
export {
  initShellUpdater,
  checkForShellUpdate,
  downloadShellUpdate,
  installShellUpdate,
  startAutoUpdateCheck,
  stopAutoUpdateCheck,
  getShellUpdaterState,
  getCurrentVersion,
  isUpdateAvailable,
  isUpdateReady,
  updateShellUpdaterConfig,
  resetShellUpdaterState,
} from './shell-updater';

// Business updater
export {
  initBusinessUpdater,
  checkForBusinessUpdate,
  downloadBusinessUpdate,
  applyBusinessUpdate,
  getActiveSlotPath,
  getBusinessUpdaterState,
  getCurrentBusinessVersion,
  isBusinessUpdateAvailable,
  isBusinessUpdateReady,
  updateBusinessUpdaterConfig,
  resetBusinessUpdaterState,
} from './business-updater';

// Rollback
export {
  initRollback,
  createBackup,
  rollbackToVersion,
  rollbackToPrevious,
  getAvailableBackups,
  hasBackup,
  getRollbackState,
  isRollingBack,
  removeBackup,
  clearAllBackups,
  updateRollbackConfig,
  resetRollbackState,
} from './rollback';
