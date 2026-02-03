/**
 * @kiosk/security type definitions
 */

import type { BrowserWindow } from 'electron';

/**
 * Supported platforms
 */
export type Platform = 'win32' | 'darwin';

/**
 * Shortcut definition
 */
export interface Shortcut {
  /** Accelerator string (e.g., 'Alt+F4', 'Cmd+Q') */
  accelerator: string;
  /** Description of what this shortcut does */
  description: string;
  /** Platforms where this shortcut applies */
  platforms: Platform[];
}

/**
 * Shortcut blocking configuration
 */
export interface ShortcutBlockerConfig {
  /** Block default dangerous shortcuts */
  blockDefaults?: boolean;
  /** Additional shortcuts to block */
  additionalShortcuts?: string[];
  /** Shortcuts to exclude from blocking */
  excludeShortcuts?: string[];
  /** Allow DevTools shortcuts (F12, Ctrl+Shift+I / Cmd+Option+I) */
  allowDevTools?: boolean;
}

/**
 * Shortcut blocker state
 */
export interface ShortcutBlockerState {
  /** Whether the blocker is active */
  active: boolean;
  /** Currently blocked shortcuts */
  blockedShortcuts: string[];
  /** Target window (if any) */
  windowId?: number;
}

/**
 * Kiosk mode configuration
 */
export interface KioskModeConfig {
  /** Block dangerous shortcuts */
  blockShortcuts?: boolean | undefined;
  /** Enable fullscreen mode */
  fullscreen?: boolean | undefined;
  /** Always on top */
  alwaysOnTop?: boolean | undefined;
  /** Disable menu bar */
  disableMenuBar?: boolean | undefined;
  /** Allow DevTools for debugging */
  allowDevTools?: boolean | undefined;
  /** Password required to exit kiosk mode */
  exitPassword?: string | undefined;
}

/**
 * Kiosk mode state
 */
export interface KioskModeState {
  /** Whether kiosk mode is enabled */
  enabled: boolean;
  /** Current configuration */
  config: KioskModeConfig;
  /** Associated window */
  windowId?: number;
}

/**
 * IPC guard configuration
 */
export interface IpcGuardConfig {
  /** Allowed IPC channels (whitelist) */
  allowedChannels: string[];
  /** Enable source validation */
  validateSource?: boolean;
  /** Allowed webContents IDs (if validateSource is true) */
  allowedWebContentsIds?: number[];
}

/**
 * IPC validation result
 */
export interface IpcValidationResult {
  /** Whether the request is valid */
  valid: boolean;
  /** Reason for rejection (if invalid) */
  reason?: string;
  /** The channel that was validated */
  channel: string;
}

/**
 * Shortcut handler interface (for dependency injection in tests)
 */
export interface ShortcutHandler {
  /** Register a shortcut on a window */
  register(window: BrowserWindow, accelerator: string, callback: () => void): void;
  /** Unregister a shortcut from a window */
  unregister(window: BrowserWindow, accelerator: string): void;
  /** Unregister all shortcuts from a window */
  unregisterAll(window: BrowserWindow): void;
  /** Check if shortcut is registered on a window */
  isRegistered(window: BrowserWindow, accelerator: string): boolean;
}

/**
 * Result of kiosk mode operations
 */
export interface KioskModeResult {
  success: boolean;
  error?: string;
}
