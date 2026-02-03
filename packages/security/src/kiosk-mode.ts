/**
 * Kiosk mode manager
 *
 * Manages the kiosk mode state for the application, coordinating:
 * - Fullscreen mode
 * - Shortcut blocking
 * - Window configuration (always on top, menu bar, etc.)
 */

import type { BrowserWindow } from 'electron';
import { getLogger } from '@kiosk/logger';

const logger = getLogger();
import type { KioskModeConfig, KioskModeState, KioskModeResult } from './types';
import { DEFAULT_KIOSK_CONFIG, ERROR_MESSAGES } from './constants';
import { blockShortcuts, unblockShortcuts } from './shortcuts';

/**
 * Store for kiosk mode states per window
 */
const kioskStates = new Map<number, KioskModeState>();

/**
 * Default exit password (should be configured in production)
 */
let exitPassword: string | undefined;

/**
 * Set the exit password for kiosk mode
 *
 * @param password - The password required to exit kiosk mode
 */
export function setExitPassword(password: string | undefined): void {
  exitPassword = password;
}

/**
 * Verify the exit password
 *
 * @param password - The password to verify
 * @returns true if password is correct or no password is set
 */
export function verifyExitPassword(password: string): boolean {
  if (!exitPassword) {
    return true;
  }
  return password === exitPassword;
}

/**
 * Get the kiosk mode state for a window
 *
 * @param window - The BrowserWindow to get state for
 * @returns The kiosk mode state or undefined
 */
export function getKioskState(window: BrowserWindow): KioskModeState | undefined {
  return kioskStates.get(window.id);
}

/**
 * Check if kiosk mode is enabled for a window
 *
 * @param window - The BrowserWindow to check
 * @returns true if kiosk mode is enabled
 */
export function isKioskModeEnabled(window: BrowserWindow): boolean {
  const state = kioskStates.get(window.id);
  return state?.enabled ?? false;
}

/**
 * Enable kiosk mode on a window
 *
 * @param window - The BrowserWindow to enable kiosk mode on
 * @param config - Kiosk mode configuration
 * @returns Result of the operation
 */
export function enableKioskMode(
  window: BrowserWindow,
  config: KioskModeConfig = {}
): KioskModeResult {
  if (!window) {
    return {
      success: false,
      error: ERROR_MESSAGES.NO_WINDOW,
    };
  }

  const windowId = window.id;

  // Check if already enabled
  const existingState = kioskStates.get(windowId);
  if (existingState?.enabled) {
    logger.warn(`Kiosk mode already enabled on window ${windowId}`);
    return {
      success: false,
      error: ERROR_MESSAGES.KIOSK_MODE_ALREADY_ENABLED,
    };
  }

  // Merge with default config
  const finalConfig: KioskModeConfig = {
    blockShortcuts: config.blockShortcuts ?? DEFAULT_KIOSK_CONFIG.blockShortcuts,
    fullscreen: config.fullscreen ?? DEFAULT_KIOSK_CONFIG.fullscreen,
    alwaysOnTop: config.alwaysOnTop ?? DEFAULT_KIOSK_CONFIG.alwaysOnTop,
    disableMenuBar: config.disableMenuBar ?? DEFAULT_KIOSK_CONFIG.disableMenuBar,
    allowDevTools: config.allowDevTools ?? DEFAULT_KIOSK_CONFIG.allowDevTools,
    exitPassword: config.exitPassword,
  };

  try {
    // Apply fullscreen
    if (finalConfig.fullscreen) {
      window.setFullScreen(true);
    }

    // Set always on top
    if (finalConfig.alwaysOnTop) {
      window.setAlwaysOnTop(true, 'screen-saver');
    }

    // Disable menu bar (hide it)
    if (finalConfig.disableMenuBar) {
      window.setMenuBarVisibility(false);
      window.setAutoHideMenuBar(true);
    }

    // Block shortcuts
    if (finalConfig.blockShortcuts) {
      blockShortcuts(window, {
        blockDefaults: true,
        allowDevTools: finalConfig.allowDevTools ?? false,
      });
    }

    // Set exit password
    if (finalConfig.exitPassword) {
      exitPassword = finalConfig.exitPassword;
    }

    // Store state
    const state: KioskModeState = {
      enabled: true,
      config: finalConfig,
      windowId,
    };
    kioskStates.set(windowId, state);

    logger.info(`Kiosk mode enabled on window ${windowId}`, {
      fullscreen: finalConfig.fullscreen,
      alwaysOnTop: finalConfig.alwaysOnTop,
      blockShortcuts: finalConfig.blockShortcuts,
      allowDevTools: finalConfig.allowDevTools,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error(`Failed to enable kiosk mode: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Disable kiosk mode on a window
 *
 * @param window - The BrowserWindow to disable kiosk mode on
 * @param password - Password to verify (if exit password is set)
 * @returns Result of the operation
 */
export function disableKioskMode(
  window: BrowserWindow,
  password?: string
): KioskModeResult {
  if (!window) {
    return {
      success: false,
      error: ERROR_MESSAGES.NO_WINDOW,
    };
  }

  const windowId = window.id;
  const state = kioskStates.get(windowId);

  // Check if kiosk mode is enabled
  if (!state?.enabled) {
    return {
      success: false,
      error: ERROR_MESSAGES.KIOSK_MODE_NOT_ENABLED,
    };
  }

  // Verify password if required
  if (exitPassword && !verifyExitPassword(password || '')) {
    logger.warn(`Invalid password attempt to exit kiosk mode on window ${windowId}`);
    return {
      success: false,
      error: ERROR_MESSAGES.INVALID_PASSWORD,
    };
  }

  try {
    const config = state.config;

    // Exit fullscreen
    if (config.fullscreen) {
      window.setFullScreen(false);
    }

    // Disable always on top
    if (config.alwaysOnTop) {
      window.setAlwaysOnTop(false);
    }

    // Restore menu bar
    if (config.disableMenuBar) {
      window.setMenuBarVisibility(true);
      window.setAutoHideMenuBar(false);
    }

    // Unblock shortcuts
    if (config.blockShortcuts) {
      unblockShortcuts(window);
    }

    // Update state
    state.enabled = false;
    kioskStates.set(windowId, state);

    logger.info(`Kiosk mode disabled on window ${windowId}`);

    return { success: true };
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error(`Failed to disable kiosk mode: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Toggle kiosk mode on a window
 *
 * @param window - The BrowserWindow to toggle kiosk mode on
 * @param config - Configuration (used when enabling)
 * @param password - Password (used when disabling)
 * @returns Result of the operation
 */
export function toggleKioskMode(
  window: BrowserWindow,
  config?: KioskModeConfig,
  password?: string
): KioskModeResult {
  if (isKioskModeEnabled(window)) {
    return disableKioskMode(window, password);
  } else {
    return enableKioskMode(window, config);
  }
}

/**
 * Update kiosk mode configuration on a window
 * This will re-apply the kiosk mode with new settings
 *
 * @param window - The BrowserWindow to update
 * @param config - New configuration to apply
 * @returns Result of the operation
 */
export function updateKioskConfig(
  window: BrowserWindow,
  config: Partial<KioskModeConfig>
): KioskModeResult {
  const state = kioskStates.get(window.id);

  if (!state?.enabled) {
    return {
      success: false,
      error: ERROR_MESSAGES.KIOSK_MODE_NOT_ENABLED,
    };
  }

  // Disable and re-enable with new config
  const disableResult = disableKioskMode(window, exitPassword);
  if (!disableResult.success) {
    return disableResult;
  }

  const newConfig: KioskModeConfig = {
    ...state.config,
    ...config,
  };

  return enableKioskMode(window, newConfig);
}

/**
 * Reset all kiosk states (for testing)
 */
export function resetKioskStates(): void {
  kioskStates.clear();
  exitPassword = undefined;
}

/**
 * Get all windows with kiosk mode enabled
 *
 * @returns Array of window IDs with kiosk mode enabled
 */
export function getKioskModeWindows(): number[] {
  const windows: number[] = [];
  for (const [windowId, state] of kioskStates) {
    if (state.enabled) {
      windows.push(windowId);
    }
  }
  return windows;
}
