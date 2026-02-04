/**
 * Heartbeat Detection
 * Monitors process responsiveness through heartbeat mechanism
 */

import { getLogger } from '@kiosk/logger';
import type {
  HeartbeatConfig,
  HeartbeatState,
  WatchdogEvent,
  WatchdogEventHandler,
} from './types';
import {
  DEFAULT_HEARTBEAT_CONFIG,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  IPC_MESSAGE_TYPES,
} from './constants';

/**
 * Get logger instance
 */
function getHeartbeatLogger() {
  return getLogger();
}

/**
 * Log info message with heartbeat prefix
 */
function logInfo(msg: string): void {
  getHeartbeatLogger().info(`[heartbeat] ${msg}`);
}

/**
 * Log error message with heartbeat prefix
 */
function logError(msg: string): void {
  getHeartbeatLogger().error(`[heartbeat] ${msg}`);
}

/**
 * Log warning message with heartbeat prefix
 */
function logWarn(msg: string): void {
  getHeartbeatLogger().warn(`[heartbeat] ${msg}`);
}

/**
 * Module state
 */
const state: HeartbeatState = {
  active: false,
  lastHeartbeat: null,
  missedCount: 0,
  responsive: true,
};

/**
 * Current configuration
 */
let currentConfig: HeartbeatConfig = { ...DEFAULT_HEARTBEAT_CONFIG };

/**
 * Check interval timer
 */
let checkTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Event handlers
 */
const eventHandlers: Set<WatchdogEventHandler> = new Set();

/**
 * Heartbeat callback for external integration
 */
let heartbeatCallback: (() => void) | null = null;

/**
 * Emit watchdog event
 */
function emitEvent(type: WatchdogEvent['type'], data?: Record<string, unknown>): void {
  const event: WatchdogEvent = {
    type,
    timestamp: new Date(),
    data,
  };

  for (const handler of eventHandlers) {
    try {
      handler(event);
    } catch (error) {
      logError(`Event handler error: ${String(error)}`);
    }
  }
}

/**
 * Check heartbeat status
 */
function checkHeartbeat(): void {
  const now = new Date();

  if (state.lastHeartbeat === null) {
    // No heartbeat received yet
    state.missedCount++;
    logWarn(`${LOG_MESSAGES.HEARTBEAT_MISSED} (no heartbeat received yet, count: ${state.missedCount})`);
    emitEvent('heartbeat-missed', { missedCount: state.missedCount });
  } else {
    const elapsed = now.getTime() - state.lastHeartbeat.getTime();

    if (elapsed > currentConfig.timeout) {
      // Heartbeat timeout
      state.missedCount++;
      logWarn(`${LOG_MESSAGES.HEARTBEAT_MISSED} (timeout: ${elapsed}ms > ${currentConfig.timeout}ms, count: ${state.missedCount})`);
      emitEvent('heartbeat-missed', {
        missedCount: state.missedCount,
        elapsed,
        timeout: currentConfig.timeout,
      });
    } else {
      // Heartbeat is within timeout, reset missed count
      if (state.missedCount > 0) {
        state.missedCount = 0;
        logInfo('Heartbeat restored');
      }
    }
  }

  // Check if process should be considered unresponsive
  const wasResponsive = state.responsive;
  state.responsive = state.missedCount < currentConfig.missedThreshold;

  if (wasResponsive && !state.responsive) {
    logError(`Process is unresponsive (missed ${state.missedCount} heartbeats)`);
    emitEvent('process-unresponsive', { missedCount: state.missedCount });
  } else if (!wasResponsive && state.responsive) {
    logInfo('Process is responsive again');
  }
}

/**
 * Initialize heartbeat monitoring
 * @param config - Heartbeat configuration
 */
export function initHeartbeat(config?: Partial<HeartbeatConfig>): void {
  currentConfig = { ...DEFAULT_HEARTBEAT_CONFIG, ...config };
  logInfo('Heartbeat monitoring initialized');
}

/**
 * Start heartbeat monitoring
 */
export function startHeartbeat(): void {
  if (state.active) {
    logWarn('Heartbeat monitoring already active');
    return;
  }

  state.active = true;
  state.lastHeartbeat = null;
  state.missedCount = 0;
  state.responsive = true;

  // Start periodic check
  checkTimer = setInterval(() => {
    checkHeartbeat();
  }, currentConfig.interval);

  logInfo(`Heartbeat monitoring started (interval: ${currentConfig.interval}ms, timeout: ${currentConfig.timeout}ms)`);
}

/**
 * Stop heartbeat monitoring
 */
export function stopHeartbeat(): void {
  if (!state.active) {
    return;
  }

  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }

  state.active = false;
  logInfo('Heartbeat monitoring stopped');
}

/**
 * Receive a heartbeat signal
 * Call this when a heartbeat is received from the monitored process
 */
export function receiveHeartbeat(): void {
  if (!state.active) {
    logWarn('Received heartbeat but monitoring is not active');
    return;
  }

  state.lastHeartbeat = new Date();
  state.missedCount = 0;
  state.responsive = true;

  emitEvent('heartbeat-received');

  // Call external callback if registered
  if (heartbeatCallback) {
    try {
      heartbeatCallback();
    } catch (error) {
      logError(`Heartbeat callback error: ${String(error)}`);
    }
  }
}

/**
 * Send a heartbeat request (for sender side)
 * Returns the IPC message type to send
 */
export function createHeartbeatPing(): string {
  return IPC_MESSAGE_TYPES.HEARTBEAT_PING;
}

/**
 * Create a heartbeat response (for responder side)
 * Returns the IPC message type to send
 */
export function createHeartbeatPong(): string {
  return IPC_MESSAGE_TYPES.HEARTBEAT_PONG;
}

/**
 * Check if a message is a heartbeat ping
 */
export function isHeartbeatPing(message: unknown): boolean {
  return message === IPC_MESSAGE_TYPES.HEARTBEAT_PING;
}

/**
 * Check if a message is a heartbeat pong
 */
export function isHeartbeatPong(message: unknown): boolean {
  return message === IPC_MESSAGE_TYPES.HEARTBEAT_PONG;
}

/**
 * Check if heartbeat monitoring is active
 */
export function isHeartbeatActive(): boolean {
  return state.active;
}

/**
 * Check if process is responsive
 */
export function isResponsive(): boolean {
  return state.responsive;
}

/**
 * Get current heartbeat state
 */
export function getHeartbeatState(): Readonly<HeartbeatState> {
  return { ...state };
}

/**
 * Get time since last heartbeat in milliseconds
 * Returns null if no heartbeat has been received
 */
export function getTimeSinceLastHeartbeat(): number | null {
  if (state.lastHeartbeat === null) {
    return null;
  }
  return Date.now() - state.lastHeartbeat.getTime();
}

/**
 * Get current heartbeat configuration
 */
export function getHeartbeatConfig(): Readonly<HeartbeatConfig> {
  return { ...currentConfig };
}

/**
 * Register callback for heartbeat events
 */
export function onHeartbeat(callback: () => void): () => void {
  heartbeatCallback = callback;
  return () => {
    heartbeatCallback = null;
  };
}

/**
 * Add event handler
 */
export function onHeartbeatEvent(handler: WatchdogEventHandler): () => void {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

/**
 * Remove event handler
 */
export function offHeartbeatEvent(handler: WatchdogEventHandler): void {
  eventHandlers.delete(handler);
}

/**
 * Reset heartbeat state (for testing)
 */
export function resetHeartbeat(): void {
  stopHeartbeat();
  state.active = false;
  state.lastHeartbeat = null;
  state.missedCount = 0;
  state.responsive = true;
  eventHandlers.clear();
  heartbeatCallback = null;
  currentConfig = { ...DEFAULT_HEARTBEAT_CONFIG };
}

/**
 * Create IPC handler for heartbeat integration with Electron
 * Returns an object with handler functions for use with ipcMain
 */
export function createIpcHeartbeatHandler(): {
  handlePing: () => string;
  handlePong: () => void;
} {
  return {
    handlePing: () => {
      // Called when main process receives a ping, respond with pong
      return createHeartbeatPong();
    },
    handlePong: () => {
      // Called when watchdog receives a pong from main process
      receiveHeartbeat();
    },
  };
}

/**
 * Manually trigger heartbeat check (for testing)
 */
export function triggerHeartbeatCheck(): void {
  if (!state.active) {
    throw new Error(ERROR_MESSAGES.HEARTBEAT_NOT_ACTIVE);
  }
  checkHeartbeat();
}
