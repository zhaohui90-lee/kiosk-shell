/**
 * Blank screen detector for detecting and recovering from white screens
 */

import type { BrowserWindow } from 'electron';
import { getLogger } from '@kiosk/logger';
import type {
  BlankDetectionResult,
  BlankDetectorConfig,
  BlankDetectorState,
} from './types';
import {
  DEFAULT_BLANK_DETECTOR_CONFIG,
  ERROR_MESSAGES,
  getBlankDetectionScript,
} from './constants';

const logger = getLogger();

/**
 * Store for blank detector states per window
 */
const detectorStates = new Map<number, BlankDetectorState>();

/**
 * Perform blank detection on a window
 */
async function performBlankCheck(window: BrowserWindow): Promise<BlankDetectionResult> {
  const state = detectorStates.get(window.id);
  if (!state) {
    return {
      isBlank: false,
      timestamp: Date.now(),
    };
  }

  const minContentHeight = state.config.minContentHeight ?? 100;

  try {
    if (window.isDestroyed()) {
      return {
        isBlank: true,
        reason: 'error',
        details: 'Window is destroyed',
        timestamp: Date.now(),
      };
    }

    const webContents = window.webContents;
    if (!webContents) {
      return {
        isBlank: true,
        reason: 'error',
        details: 'No web contents',
        timestamp: Date.now(),
      };
    }

    // Execute detection script
    const script = getBlankDetectionScript(minContentHeight);
    const result = await webContents.executeJavaScript(script, true);

    const detectionResult: BlankDetectionResult = {
      isBlank: result.isBlank,
      reason: result.reason,
      details: result.error || (result.height !== undefined ? `height: ${result.height}` : undefined),
      timestamp: Date.now(),
    };

    return detectionResult;
  } catch (error) {
    return {
      isBlank: true,
      reason: 'error',
      details: (error as Error).message,
      timestamp: Date.now(),
    };
  }
}

/**
 * Handle blank detection interval
 */
async function handleBlankCheckInterval(window: BrowserWindow): Promise<void> {
  const state = detectorStates.get(window.id);
  if (!state || !state.active) {
    return;
  }

  const result = await performBlankCheck(window);
  state.lastResult = result;

  if (result.isBlank) {
    state.consecutiveBlankCount++;
    logger.debug(`Blank detected on window ${window.id}`, {
      consecutiveCount: state.consecutiveBlankCount,
      reason: result.reason,
    });

    const threshold = state.config.blankThreshold ?? 3;

    if (state.consecutiveBlankCount >= threshold) {
      logger.warn(`Blank threshold reached for window ${window.id}`, {
        consecutiveCount: state.consecutiveBlankCount,
        threshold,
      });

      if (state.config.onBlankDetected) {
        try {
          state.config.onBlankDetected(result);
        } catch (error) {
          logger.warn(`Error in onBlankDetected callback: ${(error as Error).message}`);
        }
      }

      // Reset count after callback
      state.consecutiveBlankCount = 0;
    }
  } else {
    // Reset count on non-blank
    if (state.consecutiveBlankCount > 0) {
      logger.debug(`Content detected on window ${window.id}, resetting blank count`);
    }
    state.consecutiveBlankCount = 0;
  }
}

/**
 * Start blank screen detection for a window
 */
export function startBlankDetection(
  window: BrowserWindow,
  config: BlankDetectorConfig = {}
): BlankDetectorState {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;

  // Check if already monitoring
  const existingState = detectorStates.get(windowId);
  if (existingState?.active) {
    logger.warn(`Blank detection already active for window ${windowId}`);
    return existingState;
  }

  const checkIntervalMs = config.checkIntervalMs ?? DEFAULT_BLANK_DETECTOR_CONFIG.checkIntervalMs;

  // Create state
  const state: BlankDetectorState = {
    windowId,
    active: true,
    consecutiveBlankCount: 0,
    config: { ...config },
  };

  detectorStates.set(windowId, state);

  // Start interval
  state.timerId = setInterval(() => {
    handleBlankCheckInterval(window).catch((error) => {
      logger.error(`Blank check error for window ${windowId}: ${(error as Error).message}`);
    });
  }, checkIntervalMs);

  // Handle window close
  window.on('closed', () => {
    stopBlankDetection(window);
  });

  logger.info(`Started blank detection for window ${windowId}`, {
    checkIntervalMs,
    blankThreshold: config.blankThreshold ?? DEFAULT_BLANK_DETECTOR_CONFIG.blankThreshold,
  });

  return state;
}

/**
 * Stop blank screen detection for a window
 */
export function stopBlankDetection(window: BrowserWindow): void {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;
  const state = detectorStates.get(windowId);

  if (!state) {
    return;
  }

  // Clear interval
  if (state.timerId) {
    clearInterval(state.timerId);
    delete state.timerId;
  }

  state.active = false;
  logger.info(`Stopped blank detection for window ${windowId}`);
}

/**
 * Get blank detector state for a window
 */
export function getBlankDetectorState(window: BrowserWindow): BlankDetectorState | undefined {
  return detectorStates.get(window.id);
}

/**
 * Perform immediate blank check
 */
export async function checkBlankNow(window: BrowserWindow): Promise<BlankDetectionResult> {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  // Ensure state exists for check
  let state = detectorStates.get(window.id);
  if (!state) {
    state = {
      windowId: window.id,
      active: false,
      consecutiveBlankCount: 0,
      config: {},
    };
    detectorStates.set(window.id, state);
  }

  return performBlankCheck(window);
}

/**
 * Update blank detector configuration
 */
export function updateBlankDetectorConfig(
  window: BrowserWindow,
  config: Partial<BlankDetectorConfig>
): void {
  const state = detectorStates.get(window.id);
  if (state) {
    state.config = { ...state.config, ...config };

    // If check interval changed and detection is active, restart
    if (config.checkIntervalMs !== undefined && state.active && state.timerId) {
      clearInterval(state.timerId);
      state.timerId = setInterval(() => {
        handleBlankCheckInterval(window).catch((error) => {
          logger.error(`Blank check error for window ${window.id}: ${(error as Error).message}`);
        });
      }, config.checkIntervalMs);
    }

    logger.info(`Updated blank detector config for window ${window.id}`);
  }
}

/**
 * Reset consecutive blank count
 */
export function resetBlankCount(window: BrowserWindow): void {
  const state = detectorStates.get(window.id);
  if (state) {
    state.consecutiveBlankCount = 0;
  }
}

/**
 * Get last detection result
 */
export function getLastBlankResult(window: BrowserWindow): BlankDetectionResult | undefined {
  return detectorStates.get(window.id)?.lastResult;
}

/**
 * Reset all blank detector states (for testing)
 */
export function resetBlankDetectorStates(): void {
  // Clear all intervals
  for (const state of detectorStates.values()) {
    if (state.timerId) {
      clearInterval(state.timerId);
    }
  }
  detectorStates.clear();
}
