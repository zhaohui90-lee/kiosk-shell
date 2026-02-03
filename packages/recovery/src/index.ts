/**
 * @kiosk/recovery
 * Recovery module for crash handling, blank screen detection, and auto retry
 */

// Types
export type {
  CrashReason,
  CrashEvent,
  CrashHandlerConfig,
  CrashHandlerState,
  BlankDetectionResult,
  BlankDetectorConfig,
  BlankDetectorState,
  RetryStrategy,
  AutoRetryConfig,
  AutoRetryState,
  RecoveryManagerConfig,
  RecoveryResult,
} from './types';

// Constants
export {
  DEFAULT_CRASH_HANDLER_CONFIG,
  DEFAULT_BLANK_DETECTOR_CONFIG,
  DEFAULT_AUTO_RETRY_CONFIG,
  RESTARTABLE_CRASH_REASONS,
  NON_RESTARTABLE_CRASH_REASONS,
  ERROR_MESSAGES,
  BLANK_DETECTION_SCRIPT,
  getBlankDetectionScript,
} from './constants';

// Crash handler
export {
  isRestartableCrash,
  startCrashMonitoring,
  stopCrashMonitoring,
  getCrashHandlerState,
  getRecentCrashes,
  clearCrashHistory,
  updateCrashHandlerConfig,
  triggerCrashRecovery,
  resetCrashHandlerStates,
} from './crash-handler';

// Blank detector
export {
  startBlankDetection,
  stopBlankDetection,
  getBlankDetectorState,
  checkBlankNow,
  updateBlankDetectorConfig,
  resetBlankCount,
  getLastBlankResult,
  resetBlankDetectorStates,
} from './blank-detector';

// Auto retry
export {
  calculateRetryDelay,
  startAutoRetry,
  cancelAutoRetry,
  getAutoRetryState,
  isRetrying,
  resetRetryAttempts,
  updateAutoRetryConfig,
  getTotalRetries,
  resetAutoRetryStates,
} from './auto-retry';
