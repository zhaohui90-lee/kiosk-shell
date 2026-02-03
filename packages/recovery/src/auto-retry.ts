/**
 * Auto retry mechanism for recovering from failures
 */

import type { BrowserWindow } from 'electron';
import { getLogger } from '@kiosk/logger';
import type {
  AutoRetryConfig,
  AutoRetryState,
  RecoveryResult,
} from './types';
import { ERROR_MESSAGES } from './constants';

const logger = getLogger();

/**
 * Store for auto retry states per window
 */
const retryStates = new Map<number, AutoRetryState>();

/**
 * Map of pending retry timers
 */
const retryTimers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Calculate delay based on retry strategy
 */
export function calculateRetryDelay(
  attempt: number,
  config: AutoRetryConfig
): number {
  // Use explicit defaults with fallback values
  const initialDelay = config.initialDelayMs ?? 1000;
  const maxDelay = config.maxDelayMs ?? 30000;
  const strategy = config.strategy ?? 'exponential';
  const multiplier = config.backoffMultiplier ?? 2;

  let delay: number;

  switch (strategy) {
    case 'fixed':
      delay = initialDelay;
      break;

    case 'linear':
      // Linear increase: initialDelay * (attempt + 1)
      delay = initialDelay * (attempt + 1);
      break;

    case 'exponential':
    default:
      // Exponential backoff: initialDelay * multiplier^attempt
      delay = initialDelay * Math.pow(multiplier, attempt);
      break;
  }

  // Cap at max delay
  return Math.min(delay, maxDelay);
}

/**
 * Execute retry (reload window)
 */
async function executeRetry(window: BrowserWindow): Promise<boolean> {
  try {
    if (window.isDestroyed()) {
      logger.error(`Cannot retry: window ${window.id} is destroyed`);
      return false;
    }

    const webContents = window.webContents;
    if (!webContents) {
      logger.error(`Cannot retry: window ${window.id} has no web contents`);
      return false;
    }

    webContents.reload();
    logger.info(`Reloaded window ${window.id} for retry`);
    return true;
  } catch (error) {
    logger.error(`Retry failed for window ${window.id}: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Perform a single retry attempt
 */
async function performRetryAttempt(
  window: BrowserWindow,
  state: AutoRetryState
): Promise<RecoveryResult> {
  const maxRetries = state.config.maxRetries ?? 5;

  // Check if max retries exceeded
  if (state.currentAttempt >= maxRetries) {
    logger.error(`Max retries (${maxRetries}) exceeded for window ${window.id}`);

    state.retrying = false;

    if (state.config.onMaxRetriesExceeded) {
      try {
        state.config.onMaxRetriesExceeded();
      } catch (error) {
        logger.warn(`Error in onMaxRetriesExceeded callback: ${(error as Error).message}`);
      }
    }

    return { success: false, error: ERROR_MESSAGES.MAX_RETRIES_EXCEEDED };
  }

  const delay = calculateRetryDelay(state.currentAttempt, state.config);

  logger.info(`Scheduling retry attempt ${state.currentAttempt + 1}/${maxRetries} for window ${window.id} in ${delay}ms`);

  // Call before retry callback
  if (state.config.onBeforeRetry) {
    try {
      state.config.onBeforeRetry(state.currentAttempt, delay);
    } catch (error) {
      logger.warn(`Error in onBeforeRetry callback: ${(error as Error).message}`);
    }
  }

  // Schedule retry
  return new Promise((resolve) => {
    const timerId = setTimeout(async () => {
      retryTimers.delete(window.id);

      const success = await executeRetry(window);

      if (success) {
        state.currentAttempt++;
        state.totalRetries++;
        state.lastRetryTime = Date.now();

        // Mark as not retrying (retry completed, waiting for result)
        state.retrying = false;

        if (state.config.onRetrySuccess) {
          try {
            state.config.onRetrySuccess();
          } catch (error) {
            logger.warn(`Error in onRetrySuccess callback: ${(error as Error).message}`);
          }
        }

        resolve({ success: true, action: 'reload' });
      } else {
        state.retrying = false;
        resolve({ success: false, error: 'Retry execution failed' });
      }
    }, delay);

    retryTimers.set(window.id, timerId);
  });
}

/**
 * Start auto retry for a window
 */
export function startAutoRetry(
  window: BrowserWindow,
  config: AutoRetryConfig = {}
): RecoveryResult {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;

  // Check if retry already in progress
  const existingState = retryStates.get(windowId);
  if (existingState?.retrying) {
    logger.warn(`Auto retry already in progress for window ${windowId}`);
    return { success: false, error: ERROR_MESSAGES.RETRY_IN_PROGRESS };
  }

  // Create or update state
  const state: AutoRetryState = {
    windowId,
    retrying: true,
    currentAttempt: existingState?.currentAttempt ?? 0,
    totalRetries: existingState?.totalRetries ?? 0,
    config: { ...config },
  };

  retryStates.set(windowId, state);

  // Handle window close
  window.once('closed', () => {
    cancelAutoRetry(window);
  });

  // Start retry process (async, non-blocking)
  performRetryAttempt(window, state).catch((error) => {
    logger.error(`Auto retry error for window ${windowId}: ${(error as Error).message}`);
  });

  return { success: true, action: 'reload' };
}

/**
 * Cancel pending auto retry for a window
 */
export function cancelAutoRetry(window: BrowserWindow): void {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;

  // Clear pending timer
  const timerId = retryTimers.get(windowId);
  if (timerId) {
    clearTimeout(timerId);
    retryTimers.delete(windowId);
  }

  // Update state
  const state = retryStates.get(windowId);
  if (state) {
    state.retrying = false;
  }

  logger.info(`Cancelled auto retry for window ${windowId}`);
}

/**
 * Get auto retry state for a window
 */
export function getAutoRetryState(window: BrowserWindow): AutoRetryState | undefined {
  return retryStates.get(window.id);
}

/**
 * Check if auto retry is in progress
 */
export function isRetrying(window: BrowserWindow): boolean {
  const state = retryStates.get(window.id);
  return state?.retrying ?? false;
}

/**
 * Reset retry attempts for a window
 */
export function resetRetryAttempts(window: BrowserWindow): void {
  const state = retryStates.get(window.id);
  if (state) {
    state.currentAttempt = 0;
    logger.info(`Reset retry attempts for window ${window.id}`);
  }
}

/**
 * Update auto retry configuration
 */
export function updateAutoRetryConfig(
  window: BrowserWindow,
  config: Partial<AutoRetryConfig>
): void {
  const state = retryStates.get(window.id);
  if (state) {
    state.config = { ...state.config, ...config };
    logger.info(`Updated auto retry config for window ${window.id}`);
  }
}

/**
 * Get total retry count for a window
 */
export function getTotalRetries(window: BrowserWindow): number {
  return retryStates.get(window.id)?.totalRetries ?? 0;
}

/**
 * Reset all auto retry states (for testing)
 */
export function resetAutoRetryStates(): void {
  // Clear all pending timers
  for (const timerId of retryTimers.values()) {
    clearTimeout(timerId);
  }
  retryTimers.clear();
  retryStates.clear();
}
