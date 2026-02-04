/**
 * @kiosk/watchdog constants
 * Watchdog module constants
 */

import type { MonitorConfig, HeartbeatConfig } from './types';

/**
 * Default monitor configuration
 */
export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  checkInterval: 5000,
  autoRestart: true,
  restartStrategy: 'exponential-backoff',
  maxRestartAttempts: 5,
  restartDelay: 2000,
  maxBackoffDelay: 60000,
};

/**
 * Default heartbeat configuration
 */
export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  interval: 3000,
  timeout: 10000,
  missedThreshold: 3,
  ipcChannel: 'kiosk-heartbeat',
};

/**
 * Minimum and maximum values for configuration
 */
export const CONFIG_LIMITS = {
  /** Minimum check interval (1 second) */
  MIN_CHECK_INTERVAL: 1000,
  /** Maximum check interval (5 minutes) */
  MAX_CHECK_INTERVAL: 300000,
  /** Minimum heartbeat interval (1 second) */
  MIN_HEARTBEAT_INTERVAL: 1000,
  /** Maximum heartbeat interval (1 minute) */
  MAX_HEARTBEAT_INTERVAL: 60000,
  /** Minimum heartbeat timeout (2 seconds) */
  MIN_HEARTBEAT_TIMEOUT: 2000,
  /** Maximum heartbeat timeout (5 minutes) */
  MAX_HEARTBEAT_TIMEOUT: 300000,
  /** Minimum restart delay (500ms) */
  MIN_RESTART_DELAY: 500,
  /** Maximum restart delay (5 minutes) */
  MAX_RESTART_DELAY: 300000,
  /** Minimum missed threshold */
  MIN_MISSED_THRESHOLD: 1,
  /** Maximum missed threshold */
  MAX_MISSED_THRESHOLD: 10,
} as const;

/**
 * Initial backoff delay for exponential backoff
 */
export const INITIAL_BACKOFF_DELAY = 1000;

/**
 * Backoff multiplier for exponential backoff
 */
export const BACKOFF_MULTIPLIER = 2;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NOT_INITIALIZED: 'Watchdog is not initialized',
  ALREADY_MONITORING: 'Monitoring is already active',
  NOT_MONITORING: 'Monitoring is not active',
  INVALID_PID: 'Invalid process ID',
  PROCESS_NOT_FOUND: 'Process not found',
  RESTART_FAILED: 'Failed to restart process',
  MAX_RESTARTS_REACHED: 'Maximum restart attempts reached',
  HEARTBEAT_NOT_ACTIVE: 'Heartbeat monitoring is not active',
  WINDOWS_ONLY: 'Watchdog is only supported on Windows',
  INVALID_CONFIG: 'Invalid configuration provided',
  NO_EXECUTABLE_PATH: 'Executable path is required for restart',
} as const;

/**
 * Log messages
 */
export const LOG_MESSAGES = {
  MONITORING_STARTED: 'Process monitoring started',
  MONITORING_STOPPED: 'Process monitoring stopped',
  PROCESS_RUNNING: 'Process is running',
  PROCESS_STOPPED: 'Process has stopped',
  PROCESS_CRASHED: 'Process has crashed',
  PROCESS_UNRESPONSIVE: 'Process is unresponsive',
  RESTARTING_PROCESS: 'Restarting process',
  RESTART_SUCCESSFUL: 'Process restarted successfully',
  RESTART_FAILED: 'Failed to restart process',
  HEARTBEAT_RECEIVED: 'Heartbeat received',
  HEARTBEAT_MISSED: 'Heartbeat missed',
  MAX_RESTARTS_REACHED: 'Maximum restart attempts reached',
} as const;

/**
 * Windows process states (from tasklist)
 */
export const WINDOWS_PROCESS_STATES = {
  RUNNING: 'Running',
  NOT_RESPONDING: 'Not Responding',
} as const;

/**
 * IPC message types for heartbeat
 */
export const IPC_MESSAGE_TYPES = {
  HEARTBEAT_PING: 'heartbeat:ping',
  HEARTBEAT_PONG: 'heartbeat:pong',
  STATUS_REQUEST: 'status:request',
  STATUS_RESPONSE: 'status:response',
} as const;
