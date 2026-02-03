/**
 * Shortcut blocker implementation
 *
 * Uses electron-localshortcut to intercept and block shortcuts on specific windows.
 * Provides platform-aware blocking for dangerous shortcuts in kiosk mode.
 */

import type { BrowserWindow } from 'electron';
import { getLogger } from '@kiosk/logger';

const logger = getLogger();
import type {
  ShortcutBlockerConfig,
  ShortcutBlockerState,
  ShortcutHandler,
  Platform,
} from './types';
import {
  DEFAULT_BLOCKED_SHORTCUTS,
  DEVTOOLS_SHORTCUTS,
  CURRENT_PLATFORM,
  ERROR_MESSAGES,
} from './constants';

/**
 * Default shortcut handler using electron-localshortcut
 * This is lazily loaded to avoid issues in non-Electron environments
 */
let electronLocalShortcut: ShortcutHandler | null = null;

/**
 * Get the electron-localshortcut handler
 * Lazily loads the module to support testing environments
 */
function getLocalShortcutHandler(): ShortcutHandler {
  if (!electronLocalShortcut) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const localShortcut = require('electron-localshortcut');
      electronLocalShortcut = {
        register: localShortcut.register,
        unregister: localShortcut.unregister,
        unregisterAll: localShortcut.unregisterAll,
        isRegistered: localShortcut.isRegistered,
      };
    } catch {
      // Fallback for non-Electron environments
      electronLocalShortcut = createMockHandler();
    }
  }
  return electronLocalShortcut;
}

/**
 * Create a mock handler for testing
 */
function createMockHandler(): ShortcutHandler {
  const registeredShortcuts = new Map<number, Set<string>>();

  return {
    register(window: BrowserWindow, accelerator: string, _callback: () => void): void {
      const windowId = window.id;
      if (!registeredShortcuts.has(windowId)) {
        registeredShortcuts.set(windowId, new Set());
      }
      registeredShortcuts.get(windowId)!.add(accelerator);
    },
    unregister(window: BrowserWindow, accelerator: string): void {
      const shortcuts = registeredShortcuts.get(window.id);
      if (shortcuts) {
        shortcuts.delete(accelerator);
      }
    },
    unregisterAll(window: BrowserWindow): void {
      registeredShortcuts.delete(window.id);
    },
    isRegistered(window: BrowserWindow, accelerator: string): boolean {
      const shortcuts = registeredShortcuts.get(window.id);
      return shortcuts ? shortcuts.has(accelerator) : false;
    },
  };
}

/**
 * State storage for blocked shortcuts per window
 */
const blockerStates = new Map<number, ShortcutBlockerState>();

/**
 * Custom shortcut handler (for dependency injection in tests)
 */
let customHandler: ShortcutHandler | null = null;

/**
 * Set a custom shortcut handler (for testing)
 */
export function setShortcutHandler(handler: ShortcutHandler | null): void {
  customHandler = handler;
}

/**
 * Get the current shortcut handler
 */
function getHandler(): ShortcutHandler {
  return customHandler || getLocalShortcutHandler();
}

/**
 * Get shortcuts to block based on configuration and platform
 */
export function getShortcutsToBlock(
  config: ShortcutBlockerConfig,
  platform: Platform = CURRENT_PLATFORM
): string[] {
  const shortcuts = new Set<string>();

  // Add default blocked shortcuts if enabled
  if (config.blockDefaults !== false) {
    for (const shortcut of DEFAULT_BLOCKED_SHORTCUTS) {
      if (shortcut.platforms.includes(platform)) {
        shortcuts.add(shortcut.accelerator);
      }
    }
  }

  // Add DevTools shortcuts if not allowed
  if (!config.allowDevTools) {
    for (const shortcut of DEVTOOLS_SHORTCUTS) {
      if (shortcut.platforms.includes(platform)) {
        shortcuts.add(shortcut.accelerator);
      }
    }
  }

  // Add additional shortcuts
  if (config.additionalShortcuts) {
    for (const shortcut of config.additionalShortcuts) {
      shortcuts.add(shortcut);
    }
  }

  // Remove excluded shortcuts
  if (config.excludeShortcuts) {
    for (const shortcut of config.excludeShortcuts) {
      shortcuts.delete(shortcut);
    }
  }

  return Array.from(shortcuts);
}

/**
 * Block shortcuts on a window
 *
 * @param window - The BrowserWindow to block shortcuts on
 * @param config - Configuration for which shortcuts to block
 * @returns The blocker state
 */
export function blockShortcuts(
  window: BrowserWindow,
  config: ShortcutBlockerConfig = {}
): ShortcutBlockerState {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;
  const handler = getHandler();

  // Check if already blocking on this window
  const existingState = blockerStates.get(windowId);
  if (existingState?.active) {
    // Unblock first before reapplying
    unblockShortcuts(window);
  }

  const shortcutsToBlock = getShortcutsToBlock(config);
  const blockedShortcuts: string[] = [];

  // Register each shortcut with an empty handler (blocks the shortcut)
  for (const accelerator of shortcutsToBlock) {
    try {
      handler.register(window, accelerator, () => {
        // Empty handler - this blocks the shortcut
        logger.debug(`Blocked shortcut: ${accelerator}`);
      });
      blockedShortcuts.push(accelerator);
    } catch (error) {
      // Some shortcuts might fail to register (already registered globally, etc.)
      logger.warn(`Failed to block shortcut ${accelerator}: ${(error as Error).message}`);
    }
  }

  const state: ShortcutBlockerState = {
    active: true,
    blockedShortcuts,
    windowId,
  };

  blockerStates.set(windowId, state);

  logger.info(`Blocked ${blockedShortcuts.length} shortcuts on window ${windowId}`);

  return state;
}

/**
 * Unblock all shortcuts on a window
 *
 * @param window - The BrowserWindow to unblock shortcuts on
 */
export function unblockShortcuts(window: BrowserWindow): void {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const windowId = window.id;
  const handler = getHandler();
  const state = blockerStates.get(windowId);

  if (!state?.active) {
    return;
  }

  // Unregister all shortcuts from this window
  handler.unregisterAll(window);

  // Update state
  state.active = false;
  state.blockedShortcuts = [];

  logger.info(`Unblocked all shortcuts on window ${windowId}`);
}

/**
 * Get the blocker state for a window
 *
 * @param window - The BrowserWindow to get state for
 * @returns The blocker state or undefined if not blocking
 */
export function getBlockerState(window: BrowserWindow): ShortcutBlockerState | undefined {
  return blockerStates.get(window.id);
}

/**
 * Check if a specific shortcut is blocked on a window
 *
 * @param window - The BrowserWindow to check
 * @param accelerator - The shortcut accelerator to check
 * @returns true if the shortcut is blocked
 */
export function isShortcutBlocked(window: BrowserWindow, accelerator: string): boolean {
  const handler = getHandler();
  return handler.isRegistered(window, accelerator);
}

/**
 * Block a single shortcut on a window
 *
 * @param window - The BrowserWindow to block the shortcut on
 * @param accelerator - The shortcut accelerator to block
 */
export function blockSingleShortcut(window: BrowserWindow, accelerator: string): void {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const handler = getHandler();
  const windowId = window.id;

  // Get or create state
  let state = blockerStates.get(windowId);
  if (!state) {
    state = {
      active: true,
      blockedShortcuts: [],
      windowId,
    };
    blockerStates.set(windowId, state);
  }

  // Check if already blocked
  if (handler.isRegistered(window, accelerator)) {
    return;
  }

  try {
    handler.register(window, accelerator, () => {
      logger.debug(`Blocked shortcut: ${accelerator}`);
    });
    state.blockedShortcuts.push(accelerator);
    state.active = true;
    logger.info(`Blocked shortcut ${accelerator} on window ${windowId}`);
  } catch (error) {
    logger.warn(`Failed to block shortcut ${accelerator}: ${(error as Error).message}`);
  }
}

/**
 * Unblock a single shortcut on a window
 *
 * @param window - The BrowserWindow to unblock the shortcut on
 * @param accelerator - The shortcut accelerator to unblock
 */
export function unblockSingleShortcut(window: BrowserWindow, accelerator: string): void {
  if (!window) {
    throw new Error(ERROR_MESSAGES.NO_WINDOW);
  }

  const handler = getHandler();
  const windowId = window.id;
  const state = blockerStates.get(windowId);

  if (!state) {
    return;
  }

  handler.unregister(window, accelerator);

  // Remove from state
  const index = state.blockedShortcuts.indexOf(accelerator);
  if (index > -1) {
    state.blockedShortcuts.splice(index, 1);
  }

  // Update active state
  if (state.blockedShortcuts.length === 0) {
    state.active = false;
  }

  logger.info(`Unblocked shortcut ${accelerator} on window ${windowId}`);
}

/**
 * Reset all blocker states (for testing)
 */
export function resetBlockerStates(): void {
  blockerStates.clear();
  customHandler = null;
}
