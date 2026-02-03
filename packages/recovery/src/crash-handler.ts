/**
 * Crash handler for monitoring and recovering from renderer crashes
 */

import type { BrowserWindow } from 'electron';
import { getLogger } from '@kiosk/logger';
import type {
  CrashEvent,
  CrashReason,
  CrashHandlerConfig,
  CrashHandlerState,
  RecoveryResult,
} from './types';
import {
  DEFAULT_CRASH_HANDLER_CONFIG,
  RESTARTABLE_CRASH_REASONS,
  ERROR_MESSAGES,
} from './constants';

const logger = getLogger();

/**
 * Store for crash handler states per window
 */
const handlerStates = new Map<number, CrashHandlerState>();

/**
 * Map of window event listeners for cleanup
 */
const eventListeners = new Map<number, () => void>();

/**
 * Check if a crash reason should trigger automatic restart
 */
export function isRestartableCrash(reason: CrashReason): boolean {
  return (RESTARTABLE_CRASH_REASONS as readonly string[]).includes(reason);
}

/**
 * Get crashes within the restart window
 */
function getCrashesInWindow(state: CrashHandlerState): CrashEvent[] {
  const now = Date.now();
  const windowMs = state.config.restartWindowMs ?? 60000;
  return state.crashes.filter((crash) => now - crash.timestamp < windowMs);
}

/**
 * Check if max restarts have been exceeded
 */
function hasExceededMaxRestarts(state: CrashHandlerState): boolean {
  const maxRestarts = state.config.maxRestarts ?? 3;
  const recentCrashes = getCrashesInWindow(state);
  return recentCrashes.length >= maxRestarts;
}

/**
 * Handle a crash event
 */
function handleCrash(
  window: BrowserWindow,
  reason: CrashReason,
  exitCode: number
): RecoveryResult {
  const windowId = window.id;
  const state = handlerStates.get(windowId);

  if (!state) {
    return { success: false, error: ERROR_MESSAGES.MONITORING_NOT_ACTIVE };
  }

  // Create crash event
  const crashEvent: CrashEvent = {
    windowId,
    reason,
    exitCode,
    timestamp: Date.now(),
    url: window.webContents?.getURL(),
  };

  // Add to crash history
  state.crashes.push(crashEvent);

  logger.error(`Renderer crashed on window ${windowId}`, {
    reason,
    exitCode,
    url: crashEvent.url,
  });

  // Call crash callback
  if (state.config.onCrash) {
    try {
      state.config.onCrash(crashEvent);
    } catch (error) {
      logger.warn(`Error in onCrash callback: ${(error as Error).message}`);
    }
  }

  // Check if we should auto restart
  const autoRestart = state.config.autoRestart ?? DEFAULT_CRASH_HANDLER_CONFIG.autoRestart;
  if (!autoRestart) {
    return { success: true, action: 'none' };
  }

  // Check if crash is restartable
  if (!isRestartableCrash(reason)) {
    logger.info(`Crash reason "${reason}" is not restartable`);
    return { success: true, action: 'none' };
  }

  // Check if max restarts exceeded
  if (hasExceededMaxRestarts(state)) {
    logger.error(`Max restarts exceeded for window ${windowId}`);

    if (state.config.onMaxRestartsExceeded) {
      try {
        state.config.onMaxRestartsExceeded(crashEvent);
      } catch (error) {
        logger.warn(`Error in onMaxRestartsExceeded callback: ${(error as Error).message}`);
      }
    }

    return { success: false, error: ERROR_MESSAGES.MAX_RESTARTS_EXCEEDED };
  }

  // Schedule restart
  const restartDelayMs = state.config.restartDelayMs ?? DEFAULT_CRASH_HANDLER_CONFIG.restartDelayMs;

  logger.info(`Scheduling restart for window ${windowId} in ${restartDelayMs}ms`);

  setTimeout(() => {
    try {
      if (!window.isDestroyed()) {
        window.webContents.reload();
        logger.info(`Reloaded window ${windowId} after crash`);
      }
    } catch (error) {
      logger.error(`Failed to reload window ${windowId}: ${(error as Error).message}`);
    }
  }, restartDelayMs);

  return { success: true, action: 'reload' };
}

/**
 * Start crash monitoring for a window
 */
export function startCrashMonitoring(
  window: BrowserWindow,
  config: CrashHandlerConfig = {}
): CrashHandlerState {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;

  // Check if already monitoring
  const existingState = handlerStates.get(windowId);
  if (existingState?.active) {
    logger.warn(`Crash monitoring already active for window ${windowId}`);
    return existingState;
  }

  // Create state
  const state: CrashHandlerState = {
    windowId,
    active: true,
    crashes: existingState?.crashes || [],
    config: { ...config },
  };

  handlerStates.set(windowId, state);

  // Register event handler for render-process-gone
  window.webContents.on('render-process-gone', (_event, details) => {
    handleCrash(window, details.reason as CrashReason, details.exitCode);
  });

  // Store cleanup function
  const cleanup = () => {
    window.webContents.removeAllListeners('render-process-gone');
  };
  eventListeners.set(windowId, cleanup);

  // Handle window close
  window.on('closed', () => {
    stopCrashMonitoring(window);
  });

  logger.info(`Started crash monitoring for window ${windowId}`);

  return state;
}

/**
 * Stop crash monitoring for a window
 */
export function stopCrashMonitoring(window: BrowserWindow): void {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;
  const state = handlerStates.get(windowId);

  if (!state) {
    return;
  }

  // Cleanup event listeners
  const cleanup = eventListeners.get(windowId);
  if (cleanup) {
    try {
      cleanup();
    } catch {
      // Window might be destroyed
    }
    eventListeners.delete(windowId);
  }

  state.active = false;
  logger.info(`Stopped crash monitoring for window ${windowId}`);
}

/**
 * Get crash handler state for a window
 */
export function getCrashHandlerState(window: BrowserWindow): CrashHandlerState | undefined {
  return handlerStates.get(window.id);
}

/**
 * Get recent crashes for a window
 */
export function getRecentCrashes(window: BrowserWindow): CrashEvent[] {
  const state = handlerStates.get(window.id);
  if (!state) {
    return [];
  }
  return getCrashesInWindow(state);
}

/**
 * Clear crash history for a window
 */
export function clearCrashHistory(window: BrowserWindow): void {
  const state = handlerStates.get(window.id);
  if (state) {
    state.crashes = [];
    logger.info(`Cleared crash history for window ${window.id}`);
  }
}

/**
 * Update crash handler configuration
 */
export function updateCrashHandlerConfig(
  window: BrowserWindow,
  config: Partial<CrashHandlerConfig>
): void {
  const state = handlerStates.get(window.id);
  if (state) {
    state.config = { ...state.config, ...config };
    logger.info(`Updated crash handler config for window ${window.id}`);
  }
}

/**
 * Manually trigger crash recovery (for testing)
 */
export function triggerCrashRecovery(
  window: BrowserWindow,
  reason: CrashReason = 'crashed'
): RecoveryResult {
  return handleCrash(window, reason, 1);
}

/**
 * Reset all crash handler states (for testing)
 */
export function resetCrashHandlerStates(): void {
  // Cleanup all listeners
  for (const cleanup of eventListeners.values()) {
    try {
      cleanup();
    } catch {
      // Ignore errors during cleanup
    }
  }
  eventListeners.clear();
  handlerStates.clear();
}
