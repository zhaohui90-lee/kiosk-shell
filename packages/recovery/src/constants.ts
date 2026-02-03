/**
 * @kiosk/recovery constants
 */

import type { CrashHandlerConfig, BlankDetectorConfig, AutoRetryConfig } from './types';

/**
 * Default crash handler configuration
 */
export const DEFAULT_CRASH_HANDLER_CONFIG: Required<Omit<CrashHandlerConfig, 'onCrash' | 'onMaxRestartsExceeded'>> = {
  autoRestart: true,
  maxRestarts: 3,
  restartWindowMs: 60000, // 1 minute
  restartDelayMs: 1000,   // 1 second
};

/**
 * Default blank detector configuration
 */
export const DEFAULT_BLANK_DETECTOR_CONFIG: Required<Omit<BlankDetectorConfig, 'onBlankDetected'>> = {
  checkIntervalMs: 5000,    // 5 seconds
  loadTimeoutMs: 30000,     // 30 seconds
  minContentHeight: 100,    // 100 pixels
  blankThreshold: 3,        // 3 consecutive checks
};

/**
 * Default auto retry configuration
 */
export const DEFAULT_AUTO_RETRY_CONFIG: Required<Omit<AutoRetryConfig, 'onBeforeRetry' | 'onRetrySuccess' | 'onMaxRetriesExceeded'>> = {
  maxRetries: 5,
  initialDelayMs: 1000,     // 1 second
  maxDelayMs: 30000,        // 30 seconds
  strategy: 'exponential',
  backoffMultiplier: 2,
};

/**
 * Crash reasons that should trigger automatic restart
 */
export const RESTARTABLE_CRASH_REASONS = [
  'crashed',
  'oom',
  'abnormal-exit',
] as const;

/**
 * Crash reasons that should NOT trigger automatic restart
 */
export const NON_RESTARTABLE_CRASH_REASONS = [
  'normal-exit',
  'killed',
  'launch-failed',
  'integrity-failure',
] as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_WINDOW: 'No window provided',
  NO_WEB_CONTENTS: 'No web contents available',
  MONITORING_ALREADY_ACTIVE: 'Monitoring is already active',
  MONITORING_NOT_ACTIVE: 'Monitoring is not active',
  MAX_RESTARTS_EXCEEDED: 'Maximum restart attempts exceeded',
  MAX_RETRIES_EXCEEDED: 'Maximum retry attempts exceeded',
  RETRY_IN_PROGRESS: 'Retry is already in progress',
  DETECTION_FAILED: 'Blank detection failed',
} as const;

/**
 * JavaScript code to detect blank screen
 * Injected into the renderer to check page content
 */
export const BLANK_DETECTION_SCRIPT = `
(function() {
  try {
    const body = document.body;
    if (!body) {
      return { isBlank: true, reason: 'no-body' };
    }

    const bodyHeight = body.scrollHeight || body.offsetHeight || body.clientHeight;
    const hasContent = bodyHeight > 0;
    const hasChildren = body.children.length > 0;
    const hasText = (body.innerText || '').trim().length > 0;

    // Check if body has meaningful content
    if (!hasContent && !hasChildren && !hasText) {
      return { isBlank: true, reason: 'empty-body', height: bodyHeight };
    }

    // Check for minimal content height
    if (bodyHeight < ${100}) {
      return { isBlank: true, reason: 'no-content', height: bodyHeight };
    }

    return { isBlank: false, height: bodyHeight };
  } catch (e) {
    return { isBlank: true, reason: 'error', error: e.message };
  }
})();
`;

/**
 * Get blank detection script with custom min height
 */
export function getBlankDetectionScript(minContentHeight: number): string {
  return `
(function() {
  try {
    const body = document.body;
    if (!body) {
      return { isBlank: true, reason: 'no-body' };
    }

    const bodyHeight = body.scrollHeight || body.offsetHeight || body.clientHeight;
    const hasContent = bodyHeight > 0;
    const hasChildren = body.children.length > 0;
    const hasText = (body.innerText || '').trim().length > 0;

    if (!hasContent && !hasChildren && !hasText) {
      return { isBlank: true, reason: 'empty-body', height: bodyHeight };
    }

    if (bodyHeight < ${minContentHeight}) {
      return { isBlank: true, reason: 'no-content', height: bodyHeight };
    }

    return { isBlank: false, height: bodyHeight };
  } catch (e) {
    return { isBlank: true, reason: 'error', error: e.message };
  }
})();
`;
}
