/**
 * @kiosk/recovery type definitions
 */

/**
 * Crash reason types from Electron
 */
export type CrashReason =
  | 'normal-exit'
  | 'abnormal-exit'
  | 'killed'
  | 'crashed'
  | 'oom'
  | 'launch-failed'
  | 'integrity-failure';

/**
 * Crash event information
 */
export interface CrashEvent {
  /** Window ID that crashed */
  windowId: number;
  /** Reason for the crash */
  reason: CrashReason;
  /** Exit code */
  exitCode: number;
  /** Timestamp of the crash */
  timestamp: number;
  /** URL that was loaded when crash occurred */
  url?: string;
}

/**
 * Crash handler configuration
 */
export interface CrashHandlerConfig {
  /** Enable automatic restart on crash */
  autoRestart?: boolean | undefined;
  /** Maximum number of restarts within the time window */
  maxRestarts?: number | undefined;
  /** Time window in milliseconds for counting restarts */
  restartWindowMs?: number | undefined;
  /** Delay before restart in milliseconds */
  restartDelayMs?: number | undefined;
  /** Callback when crash occurs */
  onCrash?: ((event: CrashEvent) => void) | undefined;
  /** Callback when max restarts exceeded */
  onMaxRestartsExceeded?: ((event: CrashEvent) => void) | undefined;
}

/**
 * Crash handler state for a window
 */
export interface CrashHandlerState {
  /** Window ID */
  windowId: number;
  /** Whether monitoring is active */
  active: boolean;
  /** Recent crash events */
  crashes: CrashEvent[];
  /** Configuration */
  config: CrashHandlerConfig;
}

/**
 * Blank screen detection result
 */
export interface BlankDetectionResult {
  /** Whether the screen is blank */
  isBlank: boolean;
  /** Reason for blank detection */
  reason?: 'empty-body' | 'no-content' | 'timeout' | 'error';
  /** Additional details */
  details?: string;
  /** Timestamp of detection */
  timestamp: number;
}

/**
 * Blank detector configuration
 */
export interface BlankDetectorConfig {
  /** Check interval in milliseconds */
  checkIntervalMs?: number | undefined;
  /** Timeout for page load in milliseconds */
  loadTimeoutMs?: number | undefined;
  /** Minimum content height to consider page not blank */
  minContentHeight?: number | undefined;
  /** Number of consecutive blank checks before triggering */
  blankThreshold?: number | undefined;
  /** Callback when blank screen detected */
  onBlankDetected?: ((result: BlankDetectionResult) => void) | undefined;
}

/**
 * Blank detector state for a window
 */
export interface BlankDetectorState {
  /** Window ID */
  windowId: number;
  /** Whether detection is active */
  active: boolean;
  /** Consecutive blank count */
  consecutiveBlankCount: number;
  /** Last check result */
  lastResult?: BlankDetectionResult;
  /** Configuration */
  config: BlankDetectorConfig;
  /** Timer ID for interval checks */
  timerId?: ReturnType<typeof setInterval>;
}

/**
 * Retry strategy
 */
export type RetryStrategy = 'fixed' | 'exponential' | 'linear';

/**
 * Auto retry configuration
 */
export interface AutoRetryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number | undefined;
  /** Initial delay in milliseconds */
  initialDelayMs?: number | undefined;
  /** Maximum delay in milliseconds */
  maxDelayMs?: number | undefined;
  /** Retry strategy */
  strategy?: RetryStrategy | undefined;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number | undefined;
  /** Callback before retry */
  onBeforeRetry?: ((attempt: number, delay: number) => void) | undefined;
  /** Callback after successful retry */
  onRetrySuccess?: (() => void) | undefined;
  /** Callback when max retries exceeded */
  onMaxRetriesExceeded?: (() => void) | undefined;
}

/**
 * Auto retry state for a window
 */
export interface AutoRetryState {
  /** Window ID */
  windowId: number;
  /** Whether retry is in progress */
  retrying: boolean;
  /** Current retry attempt (0-based) */
  currentAttempt: number;
  /** Total retry count for this session */
  totalRetries: number;
  /** Last retry timestamp */
  lastRetryTime?: number;
  /** Configuration */
  config: AutoRetryConfig;
}

/**
 * Recovery manager configuration
 */
export interface RecoveryManagerConfig {
  /** Crash handler configuration */
  crashHandler?: CrashHandlerConfig | undefined;
  /** Blank detector configuration */
  blankDetector?: BlankDetectorConfig | undefined;
  /** Auto retry configuration */
  autoRetry?: AutoRetryConfig | undefined;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Recovery action taken */
  action?: 'reload' | 'restart' | 'none';
}
