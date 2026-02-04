/**
 * @kiosk/watchdog type definitions
 * Watchdog module for process monitoring (Windows only)
 */

/**
 * Process state enumeration
 */
export type ProcessState = 'running' | 'stopped' | 'crashed' | 'unresponsive' | 'unknown';

/**
 * Restart strategy when process fails
 */
export type RestartStrategy = 'immediate' | 'delayed' | 'exponential-backoff' | 'none';

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  /** Process ID to monitor */
  pid?: number;
  /** Process name to find (used if pid not provided) */
  processName?: string;
  /** Check interval in milliseconds */
  checkInterval: number;
  /** Whether to auto-restart on failure */
  autoRestart: boolean;
  /** Restart strategy */
  restartStrategy: RestartStrategy;
  /** Maximum restart attempts before giving up (0 = unlimited) */
  maxRestartAttempts: number;
  /** Delay before restart in milliseconds (for 'delayed' strategy) */
  restartDelay: number;
  /** Maximum delay for exponential backoff in milliseconds */
  maxBackoffDelay: number;
  /** Path to the executable to restart */
  executablePath?: string;
  /** Arguments for the executable */
  executableArgs?: string[];
  /** Working directory for the process */
  workingDirectory?: string;
}

/**
 * Heartbeat configuration
 */
export interface HeartbeatConfig {
  /** Heartbeat interval in milliseconds */
  interval: number;
  /** Timeout to consider process unresponsive in milliseconds */
  timeout: number;
  /** Number of missed heartbeats before considering unresponsive */
  missedThreshold: number;
  /** IPC channel name for heartbeat */
  ipcChannel: string;
}

/**
 * Monitor state
 */
export interface MonitorState {
  /** Whether monitoring is active */
  active: boolean;
  /** Current process state */
  processState: ProcessState;
  /** Process ID being monitored */
  pid: number | null;
  /** Number of restart attempts */
  restartAttempts: number;
  /** Last check timestamp */
  lastCheck: Date | null;
  /** Last state change timestamp */
  lastStateChange: Date | null;
  /** Current backoff delay (for exponential-backoff) */
  currentBackoffDelay: number;
}

/**
 * Heartbeat state
 */
export interface HeartbeatState {
  /** Whether heartbeat monitoring is active */
  active: boolean;
  /** Last heartbeat received timestamp */
  lastHeartbeat: Date | null;
  /** Number of consecutive missed heartbeats */
  missedCount: number;
  /** Whether process is considered responsive */
  responsive: boolean;
}

/**
 * Process info returned from monitoring
 */
export interface ProcessInfo {
  /** Process ID */
  pid: number;
  /** Process name */
  name: string;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** Whether process is running */
  running: boolean;
  /** Process start time */
  startTime?: Date;
}

/**
 * Watchdog event types
 */
export type WatchdogEventType =
  | 'process-started'
  | 'process-stopped'
  | 'process-crashed'
  | 'process-unresponsive'
  | 'process-restarted'
  | 'heartbeat-received'
  | 'heartbeat-missed'
  | 'monitoring-started'
  | 'monitoring-stopped'
  | 'restart-failed'
  | 'max-restarts-reached';

/**
 * Watchdog event data
 */
export interface WatchdogEvent {
  /** Event type */
  type: WatchdogEventType;
  /** Event timestamp */
  timestamp: Date;
  /** Process ID (if applicable) */
  pid?: number | undefined;
  /** Additional event data */
  data?: Record<string, unknown> | undefined;
}

/**
 * Watchdog event handler
 */
export type WatchdogEventHandler = (event: WatchdogEvent) => void;

/**
 * Complete watchdog configuration
 */
export interface WatchdogConfig {
  /** Monitor configuration */
  monitor: MonitorConfig;
  /** Heartbeat configuration */
  heartbeat: HeartbeatConfig;
}

/**
 * Complete watchdog state
 */
export interface WatchdogState {
  /** Monitor state */
  monitor: MonitorState;
  /** Heartbeat state */
  heartbeat: HeartbeatState;
}
