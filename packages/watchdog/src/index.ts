/**
 * @kiosk/watchdog
 * Watchdog module for process monitoring (Windows only)
 */

// Export types
export type {
  ProcessState,
  RestartStrategy,
  MonitorConfig,
  HeartbeatConfig,
  MonitorState,
  HeartbeatState,
  ProcessInfo,
  WatchdogEventType,
  WatchdogEvent,
  WatchdogEventHandler,
  WatchdogConfig,
  WatchdogState,
} from './types';

// Export constants
export {
  DEFAULT_MONITOR_CONFIG,
  DEFAULT_HEARTBEAT_CONFIG,
  CONFIG_LIMITS,
  INITIAL_BACKOFF_DELAY,
  BACKOFF_MULTIPLIER,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  WINDOWS_PROCESS_STATES,
  IPC_MESSAGE_TYPES,
} from './constants';

// Export monitor functions
export {
  initMonitor,
  startMonitoring,
  stopMonitoring,
  isMonitoringActive,
  getMonitorState,
  getProcessState,
  restartProcess,
  onWatchdogEvent,
  offWatchdogEvent,
  resetMonitor,
  isProcessRunning,
  getProcessInfo,
  findProcessByName,
  isPlatformSupported,
  isWindows,
} from './monitor';

// Export heartbeat functions
export {
  initHeartbeat,
  startHeartbeat,
  stopHeartbeat,
  receiveHeartbeat,
  createHeartbeatPing,
  createHeartbeatPong,
  isHeartbeatPing,
  isHeartbeatPong,
  isHeartbeatActive,
  isResponsive,
  getHeartbeatState,
  getTimeSinceLastHeartbeat,
  getHeartbeatConfig,
  onHeartbeat,
  onHeartbeatEvent,
  offHeartbeatEvent,
  resetHeartbeat,
  createIpcHeartbeatHandler,
  triggerHeartbeatCheck,
} from './heartbeat';
